const mongoose = require('mongoose');

const threadMessageSchema = new mongoose.Schema(
  {
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
    attachments: [
      {
        fileName: String,
        fileType: String,
        url: String
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const mentionThreadSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: ['open', 'waiting_reply', 'resolved'],
      default: 'open'
    },
    messages: {
      type: [threadMessageSchema],
      default: []
    }
  },
  { timestamps: true }
);

mentionThreadSchema.index({ participants: 1, updatedAt: -1 });
mentionThreadSchema.index({ task: 1 });

module.exports = mongoose.model('MentionThread', mentionThreadSchema);
