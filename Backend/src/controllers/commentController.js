const { Comment, Task, User } = require('../models');

function mayAccessTask(user, task) {
  if (!task) return false;
  if (user.role?.name === 'Keeper') return task.assignedTo.toString() === user._id.toString();
  return true;
}

async function listComments(req, res) {
  const task = await Task.findById(req.query.task);
  if (!mayAccessTask(req.user, task)) return res.status(403).json({ message: 'You cannot view this task conversation.' });
  const comments = await Comment.find({ task: task._id, visibility: 'task_team' })
    .populate('author', 'fullName email jobTitle')
    .populate('mentions', 'fullName email jobTitle')
    .sort({ createdAt: 1 });
  res.json({ comments });
}

async function createComment(req, res) {
  const task = await Task.findById(req.body.task);
  if (!mayAccessTask(req.user, task)) return res.status(403).json({ message: 'You cannot write in this task conversation.' });
  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).json({ message: 'Write a message first.' });
  if (message.length > 3000) return res.status(400).json({ message: 'Message is too long.' });
  const emails = [...new Set((message.match(/@[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((value) => value.slice(1).toLowerCase()))];
  const mentionedUsers = emails.length ? await User.find({ email: { $in: emails }, active: true }).select('_id') : [];
  const comment = await Comment.create({ task: task._id, author: req.user._id, message, mentions: mentionedUsers.map((user) => user._id), visibility: 'task_team' });
  await comment.populate('author', 'fullName email jobTitle');
  await comment.populate('mentions', 'fullName email jobTitle');
  res.status(201).json({ message: 'Message sent.', comment });
}

module.exports = { listComments, createComment };
