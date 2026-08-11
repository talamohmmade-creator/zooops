const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      default: null
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true
    },
    jobTitle: {
      type: String,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    },
    assignedZones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Zone'
      }
    ],
    assignedEnclosures: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enclosure'
      }
    ],
    customPermissions: { type: [String], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
