const mongoose = require('mongoose');

const calendarReminderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal'
    },
    enclosure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enclosure',
      required: true
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Zone',
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startAt: {
      type: Date,
      required: true
    },
    repeat: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'every_2_weeks', 'monthly'],
      default: 'none'
    },
    createsTask: {
      type: Boolean,
      default: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

calendarReminderSchema.index({ startAt: 1, assignedTo: 1 });

module.exports = mongoose.model('CalendarReminder', calendarReminderSchema);
