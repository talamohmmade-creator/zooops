const crypto = require('crypto');
const Invitation = require('../models/Invitation');
const Role = require('../models/Role');
const sendInvitationEmail = require('../utils/sendInvitationEmail');

const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
const mayInvite = (user) => ['Management', 'Admin'].includes(user.role?.name) || (user.role?.permissions || []).some((p) => p.resource === 'users' && p.actions.some((a) => ['create', 'manage'].includes(a)));

async function listInvitations(req, res) {
  if (!mayInvite(req.user)) return res.status(403).json({ message: 'You do not have permission to invite users.' });
  const invitations = await Invitation.find({ invitedBy: req.user._id }).populate('role').sort({ createdAt: -1 }).lean();
  res.json({ invitations: invitations.map(({ tokenHash, ...item }) => item) });
}

async function createInvitation(req, res) {
  try {
    if (!mayInvite(req.user)) return res.status(403).json({ message: 'You do not have permission to invite users.' });
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email || !req.body.fullName || !req.body.role) return res.status(400).json({ message: 'Email, full name, and a role are required.' });
    const role = await Role.findById(req.body.role);
    if (!role) return res.status(400).json({ message: 'The selected role no longer exists. Refresh the page and select it again.' });
    await Invitation.updateMany({ email, status: 'pending' }, { status: 'revoked' });
    const rawToken = crypto.randomBytes(32).toString('hex');
    const invitation = await Invitation.create({ email, fullName: req.body.fullName, jobTitle: req.body.jobTitle, role: role._id, customPermissions: req.body.permissions || [], tokenHash: hashToken(rawToken), invitedBy: req.user._id, expiresAt: new Date(Date.now() + 7 * 864e5) });
    const base = (process.env.INVITE_BASE_URL || process.env.PUBLIC_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');
    if (!base) return res.status(500).json({ message: 'INVITE_BASE_URL is missing in Render.' });
    const inviteLink = `${base}/App3.html?invite=${rawToken}`;
    try {
      const mailResult = await sendInvitationEmail({ to: email, fullName: invitation.fullName, roleName: role.name, inviteLink, invitedBy: req.user.fullName });
      invitation.emailStatus = 'sent'; invitation.emailError = undefined; await invitation.save();
      return res.status(201).json({ message: `Invitation accepted for delivery to ${email}.`, messageId: mailResult.messageId, invitation: { ...invitation.toObject(), role }, inviteLink });
    } catch (emailError) {
      invitation.emailStatus = 'failed'; invitation.emailError = emailError.message; await invitation.save();
      return res.status(502).json({ message: `Invitation created, but email failed: ${emailError.message}`, inviteLink });
    }
  } catch (error) {
    console.error('Create invitation failed:', error);
    return res.status(500).json({ message: `Could not create invitation: ${error.message}` });
  }
}

async function verifyInvitation(req, res) {
  const invitation = await Invitation.findOne({ tokenHash: hashToken(req.params.token), status: 'pending', expiresAt: { $gt: new Date() } }).populate('role');
  if (!invitation) return res.status(404).json({ message: 'This invitation is invalid or expired.' });
  res.json({ invitation: { email: invitation.email, fullName: invitation.fullName, jobTitle: invitation.jobTitle, role: invitation.role, expiresAt: invitation.expiresAt } });
}

module.exports = { listInvitations, createInvitation, verifyInvitation };
