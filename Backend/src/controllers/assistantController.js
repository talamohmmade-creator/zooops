const { Task, Evidence, Comment } = require('../models');

const approvedStatuses = ['supervisor_approved', 'manager_approved', 'completed'];
const rejectedStatuses = ['update_requested', 'manager_returned', 'cancelled'];
const pendingStatuses = ['assigned', 'submitted', 'manager_review'];

function dateRange(dateValue) {
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(dateValue || '') ? dateValue : new Date().toISOString().slice(0, 10);
  const start = new Date(`${selected}T00:00:00.000Z`);
  const end = new Date(`${selected}T23:59:59.999Z`);
  return { selected, start, end };
}

function names(items, limit = 8) {
  return items.slice(0, limit).map((task) => `${task.title} (${task.assignedTo?.fullName || 'unassigned'}, ${task.zone?.name || 'no zone'})`).join('; ');
}

async function askAssistant(req, res) {
  const question = String(req.body.question || '').trim();
  if (!question) return res.status(400).json({ message: 'Ask a question first.' });
  const { selected, start, end } = dateRange(req.body.date);
  const filter = { dueDate: { $gte: start, $lte: end } };
  if (req.user.role?.name === 'Keeper') filter.assignedTo = req.user._id;
  const tasks = await Task.find(filter)
    .populate('assignedTo', 'fullName email')
    .populate('createdBy', 'fullName')
    .populate('zone enclosure animal')
    .sort({ dueDate: 1 });
  const taskIds = tasks.map((task) => task._id);
  const [evidence, comments] = await Promise.all([
    Evidence.find({ task: { $in: taskIds } }),
    Comment.find({ task: { $in: taskIds }, visibility: 'task_team' })
  ]);
  const now = new Date();
  const completed = tasks.filter((task) => approvedStatuses.includes(task.status));
  const rejected = tasks.filter((task) => rejectedStatuses.includes(task.status));
  const pending = tasks.filter((task) => pendingStatuses.includes(task.status));
  const overdue = tasks.filter((task) => new Date(task.dueDate) < now && !approvedStatuses.includes(task.status));
  const waitingApproval = tasks.filter((task) => ['submitted', 'manager_review', 'supervisor_approved'].includes(task.status));
  const normalized = question.toLowerCase();
  let selectedTasks = tasks;
  let heading = `Summary for ${selected}`;
  let answer;
  const zoneMatch = normalized.match(/zone\s*([a-z0-9-]+)/i);
  const keeperMatch = normalized.match(/(?:keeper|tasks? (?:for|of|does))\s+([a-z][a-z '-]+)/i);
  if (zoneMatch) {
    selectedTasks = tasks.filter((task) => (task.zone?.name || '').toLowerCase().includes(zoneMatch[1].toLowerCase()));
    heading = `${taskLabel(selectedTasks.length)} in Zone ${zoneMatch[1]} on ${selected}`;
    answer = selectedTasks.length ? `${selectedTasks.length} task(s) found. ${names(selectedTasks)}` : `No accessible tasks were found in Zone ${zoneMatch[1]} on this date.`;
  } else if (keeperMatch) {
    const keeperName = keeperMatch[1].trim();
    selectedTasks = tasks.filter((task) => (task.assignedTo?.fullName || '').toLowerCase().includes(keeperName));
    heading = `Tasks for ${keeperName} on ${selected}`;
    answer = selectedTasks.length ? `${selectedTasks.length} task(s) found. ${names(selectedTasks)}` : `No accessible tasks were found for ${keeperName} on this date.`;
  } else if (/overdue|late|not done/.test(normalized)) {
    selectedTasks = overdue; heading = `Overdue tasks for ${selected}`;
    answer = overdue.length ? `${overdue.length} overdue task(s): ${names(overdue)}` : 'No overdue tasks were found.';
  } else if (/reject|return|failed/.test(normalized)) {
    selectedTasks = rejected; heading = `Rejected or returned tasks for ${selected}`;
    answer = rejected.length ? `${rejected.length} rejected or returned task(s): ${names(rejected)}` : 'No rejected or returned tasks were found.';
  } else if (/approval|waiting|review/.test(normalized)) {
    selectedTasks = waitingApproval; heading = `Waiting for approval on ${selected}`;
    answer = waitingApproval.length ? `${waitingApproval.length} task(s) are waiting for approval: ${names(waitingApproval)}` : 'Nothing is waiting for approval.';
  } else if (/complete|approved|finished|done/.test(normalized)) {
    selectedTasks = completed; heading = `Completed or approved tasks for ${selected}`;
    answer = completed.length ? `${completed.length} completed or approved task(s): ${names(completed)}` : 'No completed or approved tasks were found.';
  } else {
    answer = `${tasks.length} task(s) scheduled: ${completed.length} completed/approved, ${waitingApproval.length} waiting for approval, ${pending.length} pending, ${rejected.length} rejected/returned, and ${overdue.length} overdue. ${evidence.length} evidence record(s) and ${comments.length} conversation message(s) were recorded for these tasks.`;
  }
  res.json({ heading, answer, date: selected, counts: { total: tasks.length, completed: completed.length, waitingApproval: waitingApproval.length, pending: pending.length, rejected: rejected.length, overdue: overdue.length, evidence: evidence.length, comments: comments.length }, tasks: selectedTasks.slice(0, 20) });
}

function taskLabel(count) { return count === 1 ? 'Task' : 'Tasks'; }

module.exports = { askAssistant };
