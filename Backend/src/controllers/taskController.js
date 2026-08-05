const Task = require('../models/Task');
const User = require('../models/User');
const Role = require('../models/Role');
const Zone = require('../models/Zone');
const Enclosure = require('../models/Enclosure');
const Animal = require('../models/Animal');

const taskPopulate = [
  { path: 'assignedTo', select: 'fullName email jobTitle' },
  { path: 'createdBy', select: 'fullName email jobTitle' },
  { path: 'animal', select: 'name species dietNotes behaviorBaseline' },
  { path: 'enclosure', select: 'name type zone' },
  { path: 'zone', select: 'name description' },
  { path: 'approvalHistory.by', select: 'fullName email jobTitle' }
];

function getRoleName(user) {
  return user.role && user.role.name ? user.role.name : '';
}

function isOperationsCreator(user) {
  return ['Supervisor', 'Management', 'Admin'].includes(getRoleName(user));
}

function dateRange(date) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  return { $gte: start, $lte: end };
}

function buildTaskFilter(user, query) {
  const roleName = getRoleName(user);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.zone) filter.zone = query.zone;
  if (query.enclosure) filter.enclosure = query.enclosure;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.date) filter.dueDate = dateRange(query.date);

  if (roleName === 'Keeper') {
    filter.assignedTo = user._id;
  }

  if (roleName === 'Management' && query.managerQueue === 'true') {
    filter.status = { $in: ['supervisor_approved', 'manager_review', 'manager_returned', 'manager_approved'] };
  }

  return filter;
}

async function listTasks(req, res) {
  const tasks = await Task.find(buildTaskFilter(req.user, req.query))
    .populate(taskPopulate)
    .sort({ dueDate: 1, createdAt: -1 });

  res.json({ count: tasks.length, tasks });
}

async function getTaskById(req, res) {
  const task = await Task.findById(req.params.id).populate(taskPopulate);
  if (!task) return res.status(404).json({ message: 'Task not found.' });

  const isAssignedKeeper = task.assignedTo && task.assignedTo._id.toString() === req.user._id.toString();
  if (getRoleName(req.user) === 'Keeper' && !isAssignedKeeper) {
    return res.status(403).json({ message: 'You can only view tasks assigned to you.' });
  }

  res.json({ task });
}

async function getTaskOptions(req, res) {
  const users = await User.find({ active: true }).populate('role').select('fullName email jobTitle role');
  const roles = await Role.find({}).sort({ name: 1 });
  const zones = await Zone.find({}).sort({ name: 1 });
  const enclosures = await Enclosure.find({}).populate('zone', 'name').sort({ name: 1 });
  const animals = await Animal.find({ active: true }).populate('enclosure', 'name zone').sort({ name: 1 });

  res.json({
    users: users.map((user) => ({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      jobTitle: user.jobTitle,
      role: user.role ? user.role.name : ''
    })),
    roles,
    keepers: users
      .filter((user) => user.role && user.role.name === 'Keeper')
      .map((user) => ({ _id: user._id, fullName: user.fullName, email: user.email, jobTitle: user.jobTitle })),
    zones,
    enclosures,
    animals
  });
}

async function createTask(req, res) {
  if (!isOperationsCreator(req.user)) {
    return res.status(403).json({ message: 'Only Supervisor, Management, or Admin can create keeper tasks.' });
  }

  const {
    title,
    description,
    taskType,
    priority,
    dueDate,
    dueTime,
    assignedTo,
    animal,
    enclosure,
    zone,
    feedItem,
    evidenceRequired
  } = req.body;

  if (!title || !dueDate || !assignedTo || !enclosure || !zone) {
    return res.status(400).json({ message: 'Title, date, keeper, zone, and enclosure are required.' });
  }

  const finalDueDate = new Date(`${dueDate}T${dueTime || '09:00'}:00.000Z`);

  const task = await Task.create({
    title,
    description,
    taskType: taskType || 'other',
    priority: priority || 'normal',
    status: 'assigned',
    dueDate: finalDueDate,
    assignedTo,
    createdBy: req.user._id,
    animal: animal || undefined,
    enclosure,
    zone,
    feedItem,
    evidenceRequired: evidenceRequired !== false,
    approvalHistory: [{ action: 'created', by: req.user._id, comment: 'Task created and assigned.' }]
  });

  const populatedTask = await Task.findById(task._id).populate(taskPopulate);
  res.status(201).json({ message: 'Task created and assigned to keeper.', task: populatedTask });
}

async function updateTaskStatus(req, res) {
  const { status, comment } = req.body;
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
  if (!task) return res.status(404).json({ message: 'Task not found.' });

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
  task.approvalHistory.push({ action: historyActionByStatus[status], by: req.user._id, comment });

  await task.save();
  const updatedTask = await Task.findById(task._id).populate(taskPopulate);
  res.json({ message: 'Task status updated.', task: updatedTask });
}

module.exports = {
  listTasks,
  getTaskById,
  getTaskOptions,
  createTask,
  updateTaskStatus
};
