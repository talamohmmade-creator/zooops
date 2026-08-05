const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    jobTitle: {
      type: String,
      trim: true
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true
    },
    permissions: {
      type: [String],
      default: []
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending'
    },
    emailStatus: {
      type: String,
      enum: ['not_configured', 'sent', 'failed'],
      default: 'not_configured'
    },
    emailError: {
      type: String,
      trim: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    acceptedAt: Date
  },
  { timestamps: true }
);

invitationSchema.index({ email: 1, status: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
