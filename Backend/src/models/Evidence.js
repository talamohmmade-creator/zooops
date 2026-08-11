const mongoose = require('mongoose');

const evidenceFileSchema = new mongoose.Schema(
  {
    fileType: {
      type: String,
      enum: ['photo', 'video', 'pdf', 'document', 'other'],
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    storageKey: {
      type: String
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const evidenceSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    note: {
      type: String,
      trim: true
    },
    files: {
      type: [evidenceFileSchema],
      default: []
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'update_requested', 'returned'],
      default: 'draft'
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    submittedAt: Date
  },
  { timestamps: true }
);

evidenceSchema.index({ task: 1, status: 1 });

module.exports = mongoose.model('Evidence', evidenceSchema);
