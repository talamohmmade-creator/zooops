const Evidence = require('../models/Evidence');
const Task = require('../models/Task');

const getEvidence = async (req, res) => {
  try {
    const evidence = await Evidence.find()
      .populate('task')
      .populate('submittedBy', 'fullName email jobTitle')
      .populate('reviewedBy', 'fullName email jobTitle')
      .sort({ createdAt: -1 });

    res.json({
      count: evidence.length,
      evidence
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to load evidence.',
      error: error.message
    });
  }
};

const createEvidence = async (req, res) => {
  try {
    const { task, note, submitNow } = req.body;

    if (!task) {
      return res.status(400).json({ message: 'Task is required.' });
    }

    const foundTask = await Task.findById(task);

    if (!foundTask) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const files = (req.files || []).map((file) => ({
      fileType: file.mimetype.startsWith('image/')
        ? 'photo'
        : file.mimetype.startsWith('video/')
          ? 'video'
          : file.mimetype === 'application/pdf'
            ? 'pdf'
            : 'file',
      fileName: file.originalname,
      url: `${req.protocol}://${req.get('host')}/uploads/${task}/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size
    }));

    const evidence = await Evidence.create({
      task,
      submittedBy: req.user._id,
      note: note || '',
      files,
      status: submitNow === 'true' || submitNow === true ? 'submitted' : 'draft'
    });

    foundTask.status = evidence.status;
    await foundTask.save();

    res.status(201).json({
      message: evidence.status === 'submitted'
        ? 'Evidence submitted for review.'
        : 'Evidence draft saved.',
      evidence
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to submit evidence.',
      error: error.message
    });
  }
};

const updateEvidenceStatus = async (req, res) => {
  try {
    const { status, comment } = req.body;

    const evidence = await Evidence.findById(req.params.id);

    if (!evidence) {
      return res.status(404).json({ message: 'Evidence not found.' });
    }

    evidence.status = status;
    evidence.reviewedBy = req.user._id;
    evidence.reviewedAt = new Date();

    if (comment) {
      evidence.reviewComment = comment;
    }

    await evidence.save();

    await Task.findByIdAndUpdate(evidence.task, {
      status
    });

    res.json({
      message: 'Evidence status updated.',
      evidence
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update evidence status.',
      error: error.message
    });
  }
};

module.exports = {
  getEvidence,
  createEvidence,
  updateEvidenceStatus
};