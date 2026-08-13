const { CalendarReminder, Task } = require('../models');

function range(req) {
  const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = req.query.to ? new Date(req.query.to) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  return { $gte: from, $lt: to };
}

async function getCalendar(req, res) {
  const dateRange = range(req);
  const role = req.user.role?.name;
  const taskFilter = { dueDate: dateRange };
  if (role === 'Keeper') taskFilter.assignedTo = req.user._id;
  const reminderFilter = { startAt: dateRange, active: true };
  if (!['Management', 'Admin', 'Supervisor'].includes(role)) reminderFilter.assignedTo = req.user._id;
  const [tasks, reminders] = await Promise.all([
    Task.find(taskFilter).populate('assignedTo', 'fullName email').populate('zone enclosure animal').sort({ dueDate: 1 }),
    CalendarReminder.find(reminderFilter).populate('assignedTo', 'fullName email').populate('createdBy', 'fullName').populate('zone enclosure animal').sort({ startAt: 1 })
  ]);
  res.json({ tasks, reminders });
}

async function createReminder(req, res) {
  const role = req.user.role?.name;
  let assignedTo = req.body.assignedTo || req.user._id;
  if (!['Management', 'Admin', 'Supervisor'].includes(role)) assignedTo = req.user._id;
  if (!req.body.title || !req.body.startAt) return res.status(400).json({ message: 'Title, date, and time are required.' });
  const reminder = await CalendarReminder.create({
    title: req.body.title, description: req.body.description, startAt: req.body.startAt,
    repeat: req.body.repeat || 'none', assignedTo, createdBy: req.user._id,
    zone: req.body.zone || undefined, enclosure: req.body.enclosure || undefined,
    animal: req.body.animal || undefined, createsTask: false
  });
  res.status(201).json({ message: 'Reminder created.', reminder });
}

async function deleteReminder(req, res) {
  const reminder = await CalendarReminder.findById(req.params.id);
  if (!reminder) return res.status(404).json({ message: 'Reminder not found.' });
  const role = req.user.role?.name;
  if (reminder.createdBy.toString() !== req.user._id.toString() && !['Management', 'Admin'].includes(role)) return res.status(403).json({ message: 'You cannot delete this reminder.' });
  reminder.active = false; await reminder.save();
  res.json({ message: 'Reminder deleted.' });
}

module.exports = { getCalendar, createReminder, deleteReminder };
