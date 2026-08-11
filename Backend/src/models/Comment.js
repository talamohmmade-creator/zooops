const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    evidence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence'
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    visibility: {
      type: String,
      enum: ['task_team', 'supervisor_manager', 'admin_only'],
      default: 'task_team'
    }
  },
  { timestamps: true }
);

commentSchema.index({ task: 1, createdAt: 1 });
commentSchema.index({ mentions: 1 });

module.exports = mongoose.model('Comment', commentSchema);
