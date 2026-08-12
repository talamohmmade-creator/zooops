const Task = require('../models/Task');
const { User, Role, Zone, Enclosure, Animal } = require('../models');
const ensureDefaultRoles = require('../utils/ensureDefaultRoles');
const ensureDefaultLocations = require('../utils/ensureDefaultLocations');

const taskPopulate = [
  { path: 'assignedTo', select: 'fullName email jobTitle' },
  { path: 'createdBy', select: 'fullName email jobTitle' },
  { path: 'animal', select: 'name species behaviorBaseline dietNotes' },
  { path: 'enclosure', select: 'name type' },
  { path: 'zone', select: 'name description' },
  { path: 'approvalHistory.by', select: 'fullName email jobTitle' }
];

function getRoleName(user) {
  return user.role && user.role.name ? user.role.name : '';
}

function buildTaskFilter(user, query) {
  const roleName = getRoleName(user);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.zone) filter.zone = query.zone;
  if (query.enclosure) filter.enclosure = query.enclosure;

  if (query.date) {
    const start = new Date(`${query.date}T00:00:00.000Z`);
    const end = new Date(`${query.date}T23:59:59.999Z`);
    filter.dueDate = { $gte: start, $lte: end };
  }

  if (roleName === 'Keeper') {
    filter.assignedTo = user._id;
  }

  if (roleName === 'Management' && query.managerQueue === 'true') {
    filter.status = {
      $in: ['supervisor_approved', 'manager_review', 'manager_returned', 'manager_approved']
    };
  }

  return filter;
}

async function listTasks(req, res) {
  const filter = buildTaskFilter(req.user, req.query);

  const tasks = await Task.find(filter)
    .populate(taskPopulate)
    .sort({ dueDate: 1, createdAt: -1 });

  res.json({
    count: tasks.length,
    tasks
  });
}

async function getTaskOptions(req, res) {
  // Guarantee that the invite dropdown always has every system role, even when
  // an older production database originally contained only Management.
  await ensureDefaultRoles();
  await ensureDefaultLocations();
  const [keepers, users, roles, zones, enclosures, animals] = await Promise.all([
    User.find({ active: true }).populate({ path: 'role', match: { name: 'Keeper' } }).select('fullName email role'),
    User.find({ active: true }).populate('role').select('fullName email role'),
    Role.find().sort({ name: 1 }), Zone.find().sort({ name: 1 }), Enclosure.find().populate('zone').sort({ name: 1 }), Animal.find({ active: true }).populate('enclosure').sort({ name: 1 })
  ]);
  res.json({ keepers: keepers.filter((user) => user.role), users, roles, zones, enclosures, animals });
}

async function createTask(req, res) {
  const required = ['title', 'assignedTo', 'dueDate'];
  if (required.some((key) => !req.body[key])) return res.status(400).json({ message: 'Title, assignee, and due date are required.' });
  const task = await Task.create({ ...req.body, createdBy: req.user._id, status: 'assigned', approvalHistory: [{ action: 'created', by: req.user._id }] });
  res.status(201).json({ message: 'Task created.', task: await Task.findById(task._id).populate(taskPopulate) });
}

async function getTaskById(req, res) {
  const task = await Task.findById(req.params.id).populate(taskPopulate);

  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const roleName = getRoleName(req.user);
  const isAssignedKeeper =
    task.assignedTo && task.assignedTo._id.toString() === req.user._id.toString();

  if (roleName === 'Keeper' && !isAssignedKeeper) {
    return res.status(403).json({ message: 'You can only view tasks assigned to you.' });
  }

  res.json({ task });
}

async function updateTaskStatus(req, res) {
  const { status, comment } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required.' });
  }

  const allowedStatuses = [
    'assigned',
    'draft',
    'submitted',
    'supervisor_approved',
    'update_requested',
    'manager_review',
    'manager_returned',
    'manager_approved',
    'completed',
    'cancelled'
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid task status.' });
  }

  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const roleName = getRoleName(req.user);
  const isAssignedKeeper = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

  if (roleName === 'Keeper' && !isAssignedKeeper) {
    return res.status(403).json({ message: 'You can only update tasks assigned to you.' });
  }

  const historyActionByStatus = {
    assigned: 'created',
    draft: 'submitted',
    submitted: 'submitted',
    supervisor_approved: 'approved_by_supervisor',
    update_requested: 'update_requested',
    manager_review: 'sent_to_manager',
    manager_returned: 'returned_by_manager',
    manager_approved: 'manager_approved',
    completed: 'manager_approved',
    cancelled: 'update_requested'
  };

  task.status = status;

  if (status === 'submitted') task.submittedAt = new Date();
  if (status === 'supervisor_approved') task.supervisorApprovedAt = new Date();
  if (status === 'manager_approved') task.managerApprovedAt = new Date();

  task.approvalHistory.push({
    action: historyActionByStatus[status],
    by: req.user._id,
    comment
  });

  await task.save();

  const updatedTask = await Task.findById(task._id).populate(taskPopulate);

  res.json({
    message: 'Task status updated.',
    task: updatedTask
  });
}

module.exports = {
  listTasks,
  getTaskOptions,
  createTask,
  getTaskById,
  updateTaskStatus
};
