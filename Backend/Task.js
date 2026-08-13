const mongoose = require('mongoose');

const approvalHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'created',
        'submitted',
        'approved_by_supervisor',
        'update_requested',
        'sent_to_manager',
        'returned_by_manager',
        'manager_approved',
        'escalated',
        'resubmitted'
      ],
      required: true
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    taskType: {
      type: String,
      enum: ['feeding', 'cleaning', 'medical', 'observation', 'safety', 'water', 'evidence', 'other'],
      default: 'other'
    },
    priority: {
      type: String,
      enum: ['normal', 'warning', 'urgent'],
      default: 'normal'
    },
    status: {
      type: String,
      enum: [
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
      ],
      default: 'assigned'
    },
    dueDate: {
      type: Date,
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
    feedItem: {
      type: String,
      trim: true
    },
    keeperNote: {
      type: String,
      trim: true
    },
    supervisorComment: {
      type: String,
      trim: true
    },
    managerComment: {
      type: String,
      trim: true
    },
    approvalHistory: {
      type: [approvalHistorySchema],
      default: []
    },
    submittedAt: Date,
    supervisorApprovedAt: Date,
    managerApprovedAt: Date
  },
  { timestamps: true }
);

taskSchema.index({ dueDate: 1, assignedTo: 1 });
taskSchema.index({ zone: 1, enclosure: 1, dueDate: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model('Task', taskSchema);
