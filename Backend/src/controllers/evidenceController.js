const Evidence = require('../models/Evidence');
const Task = require('../models/Task');
const { hasPermission } = require('../middleware/permissionMiddleware');
const { fileToEvidenceFile } = require('../middleware/uploadMiddleware');

const evidencePopulate = [
  {
    path: 'task',
    populate: [
      { path: 'assignedTo', select: 'fullName email jobTitle' },
      { path: 'createdBy', select: 'fullName email jobTitle' },
      { path: 'animal', select: 'name species' },
      { path: 'enclosure', select: 'name type' },
      { path: 'zone', select: 'name description' }
    ]
  },
  { path: 'submittedBy', select: 'fullName email jobTitle' },
  { path: 'files.uploadedBy', select: 'fullName email jobTitle' }
];

function getRoleName(user) {
  return user.role && user.role.name ? user.role.name : '';
}

function normalizeFiles(files, userId) {
  if (!Array.isArray(files)) {
    return [];
  }

  return files.map((file) => ({
    fileType: file.fileType || 'other',
    fileName: file.fileName,
    url: file.url,
    storageKey: file.storageKey,
    uploadedBy: userId
  }));
}

function parseBoolean(value) {
  return value === true || value === 'true';
}

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function getRequestFiles(req) {
  const metadataFiles = normalizeFiles(parseJsonArray(req.body.files), req.user._id);
  const uploadedFiles = Array.isArray(req.files)
    ? req.files.map((file) => fileToEvidenceFile(file, req.user._id, req))
    : [];

  return [...metadataFiles, ...uploadedFiles];
}
async function listEvidence(req, res) {
  const roleName = getRoleName(req.user);
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.task) {
    filter.task = req.query.task;
  }

  // Keeper can only see evidence they submitted
  if (roleName === 'Keeper') {
    filter.submittedBy = req.user._id;
  }

  // Supervisor, Management, and Admin can see all evidence
  const evidence = await Evidence.find(filter)
    .populate(evidencePopulate)
    .sort({ updatedAt: -1 });

  res.json({
    count: evidence.length,
    evidence
  });
}

  const evidence = await Evidence.find(filter)
    .populate(evidencePopulate)
    .sort({ updatedAt: -1 });

  res.json({
    count: evidence.length,
    evidence
  });


async function getEvidenceById(req, res) {
  const evidence = await Evidence.findById(req.params.id).populate(evidencePopulate);

  if (!evidence) {
    return res.status(404).json({ message: 'Evidence not found.' });
  }

  const roleName = getRoleName(req.user);
  const isKeeperOwner = evidence.submittedBy._id.toString() === req.user._id.toString();

  if (roleName === 'Keeper' && !isKeeperOwner) {
    return res.status(403).json({ message: 'You can only view your own evidence.' });
  }

  res.json({ evidence });
}

async function createEvidence(req, res) {
  const { task: taskId, note } = req.body;
  const submitNow = parseBoolean(req.body.submitNow);

  if (!taskId) {
    return res.status(400).json({ message: 'Task id is required.' });
  }

  const task = await Task.findById(taskId);

  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const roleName = getRoleName(req.user);
  const isAssignedKeeper = task.assignedTo.toString() === req.user._id.toString();

  if (roleName === 'Keeper' && !isAssignedKeeper) {
    return res.status(403).json({ message: 'You can only submit evidence for your assigned tasks.' });
  }

  const evidenceStatus = submitNow ? 'submitted' : 'draft';
  const evidence = await Evidence.create({
    task: task._id,
    note,
    files: getRequestFiles(req),
    status: evidenceStatus,
    submittedBy: req.user._id,
    submittedAt: submitNow ? new Date() : undefined
  });

  task.keeperNote = note;
  task.status = submitNow ? 'submitted' : 'draft';

  if (submitNow) {
    task.submittedAt = new Date();
    task.approvalHistory.push({
      action: 'submitted',
      by: req.user._id,
      comment: note
    });
  }

  await task.save();

  const populatedEvidence = await Evidence.findById(evidence._id).populate(evidencePopulate);

  res.status(201).json({
    message: submitNow ? 'Evidence submitted for review.' : 'Evidence saved as draft.',
    evidence: populatedEvidence
  });
}

async function updateEvidence(req, res) {
  const { note } = req.body;

  const evidence = await Evidence.findById(req.params.id);

  if (!evidence) {
    return res.status(404).json({ message: 'Evidence not found.' });
  }

  const roleName = getRoleName(req.user);
  const isKeeperOwner = evidence.submittedBy.toString() === req.user._id.toString();

  if (roleName === 'Keeper' && !isKeeperOwner) {
    return res.status(403).json({ message: 'You can only edit your own evidence.' });
  }

  if (note !== undefined) {
    evidence.note = note;
  }

  const requestFiles = getRequestFiles(req);
  if (requestFiles.length > 0) {
    evidence.files.push(...requestFiles);
  }

  await evidence.save();

  const task = await Task.findById(evidence.task);
  if (task && note !== undefined) {
    task.keeperNote = note;
    await task.save();
  }

  const populatedEvidence = await Evidence.findById(evidence._id).populate(evidencePopulate);

  res.json({
    message: 'Evidence updated.',
    evidence: populatedEvidence
  });
}

async function submitEvidence(req, res) {
  const evidence = await Evidence.findById(req.params.id);

  if (!evidence) {
    return res.status(404).json({ message: 'Evidence not found.' });
  }

  const roleName = getRoleName(req.user);
  const isKeeperOwner = evidence.submittedBy.toString() === req.user._id.toString();

  if (roleName === 'Keeper' && !isKeeperOwner) {
    return res.status(403).json({ message: 'You can only submit your own evidence.' });
  }

  evidence.status = 'submitted';
  evidence.submittedAt = new Date();
  await evidence.save();

  const task = await Task.findById(evidence.task);
  if (task) {
    task.status = 'submitted';
    task.submittedAt = new Date();
    task.approvalHistory.push({
      action: 'submitted',
      by: req.user._id,
      comment: evidence.note
    });
    await task.save();
  }

  const populatedEvidence = await Evidence.findById(evidence._id).populate(evidencePopulate);

  res.json({
    message: 'Evidence submitted for review.',
    evidence: populatedEvidence
  });
}

async function updateEvidenceStatus(req, res) {
  const { status, comment } = req.body;

  const allowedStatuses = ['approved', 'update_requested', 'returned'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid evidence status.' });
  }

  if (status === 'approved' && !hasPermission(req.user, 'evidence', 'approve')) {
    return res.status(403).json({ message: 'You do not have permission to approve evidence.' });
  }

  if ((status === 'update_requested' || status === 'returned') && !hasPermission(req.user, 'evidence', 'return')) {
    return res.status(403).json({ message: 'You do not have permission to return evidence.' });
  }

  const evidence = await Evidence.findById(req.params.id);

  if (!evidence) {
    return res.status(404).json({ message: 'Evidence not found.' });
  }

  evidence.status = status;
  await evidence.save();

  const task = await Task.findById(evidence.task);
  const roleName = getRoleName(req.user);

  if (task) {
    if (status === 'approved') {
      task.status = roleName === 'Management' ? 'manager_approved' : 'supervisor_approved';
      if (roleName === 'Management') {
        task.managerApprovedAt = new Date();
      } else {
        task.supervisorApprovedAt = new Date();
      }
      task.approvalHistory.push({
        action: roleName === 'Management' ? 'manager_approved' : 'approved_by_supervisor',
        by: req.user._id,
        comment
      });
    }

    if (status === 'update_requested') {
      task.status = 'update_requested';
      task.supervisorComment = comment;
      task.approvalHistory.push({
        action: 'update_requested',
        by: req.user._id,
        comment
      });
    }

    if (status === 'returned') {
      task.status = 'manager_returned';
      task.managerComment = comment;
      task.approvalHistory.push({
        action: 'returned_by_manager',
        by: req.user._id,
        comment
      });
    }

    await task.save();
  }

  const populatedEvidence = await Evidence.findById(evidence._id).populate(evidencePopulate);

  res.json({
    message: 'Evidence status updated.',
    evidence: populatedEvidence
  });
}

module.exports = {
  listEvidence,
  getEvidenceById,
  createEvidence,
  updateEvidence,
  submitEvidence,
  updateEvidenceStatus
};
