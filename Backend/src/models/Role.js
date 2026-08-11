const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    resource: {
      type: String,
      required: true,
      enum: [
        'users',
        'roles',
        'animals',
        'enclosures',
        'tasks',
        'evidence',
        'comments',
        'mentions',
        'calendar',
        'reports',
        'ai'
      ]
    },
    actions: {
      type: [String],
      default: [],
      enum: ['create', 'read', 'update', 'delete', 'assign', 'approve', 'return', 'escalate', 'upload', 'manage']
    }
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    permissions: {
      type: [permissionSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
