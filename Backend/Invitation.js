const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  fullName: { type: String, required: true, trim: true },
  jobTitle: { type: String, trim: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  customPermissions: { type: [String], default: [] },
  tokenHash: { type: String, required: true, unique: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending' },
  expiresAt: { type: Date, required: true },
  acceptedAt: Date,
  emailStatus: { type: String, default: 'link-created' },
  emailError: String
}, { timestamps: true });

module.exports = mongoose.model('Invitation', invitationSchema);
