const crypto = require('crypto');
const Invitation = require('../models/Invitation');
const Role = require('../models/Role');
const User = require('../models/User');
const { getInviteLink, sendInvitationEmail } = require('../services/emailService');

const invitationPopulate = [
  { path: 'role', select: 'name description permissions' },
  { path: 'invitedBy', select: 'fullName email jobTitle' }
];

function roleName(user) {
  return user.role && user.role.name ? user.role.name : '';
}

function roleHasPermission(user, resource, action) {
  const permissions = user.role && Array.isArray(user.role.permissions) ? user.role.permissions : [];
  return permissions.some((permission) => {
    return permission.resource === resource && Array.isArray(permission.actions) && permission.actions.includes(action);
  });
}

function userHasCustomPermission(user, resource, action) {
  const permissions = Array.isArray(user.customPermissions) ? user.customPermissions : [];
  return permissions.includes(`${resource}.manage`) || permissions.includes(`${resource}.${action}`);
}

function canInvite(user) {
  return ['Admin', 'Management'].includes(roleName(user)) ||
    roleHasPermission(user, 'users', 'create') ||
    roleHasPermission(user, 'users', 'manage') ||
    userHasCustomPermission(user, 'users', 'create') ||
    userHasCustomPermission(user, 'users', 'manage');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function listInvitations(req, res) {
  if (!canInvite(req.user)) {
    return res.status(403).json({ message: 'You do not have permission to view invitations.' });
  }

  const invitations = await Invitation.find({})
    .populate(invitationPopulate)
    .sort({ createdAt: -1 });

  res.json({ count: invitations.length, invitations });
}

async function createInvitation(req, res) {
  if (!canInvite(req.user)) {
    return res.status(403).json({ message: 'You do not have permission to invite users.' });
  }

  const { email, fullName, jobTitle, role, permissions } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !fullName || !role) {
    return res.status(400).json({ message: 'Email, full name, and role are required.' });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: 'This email already has a ZooOps account.' });
  }

  const selectedRole = await Role.findById(role);
  if (!selectedRole) {
    return res.status(400).json({ message: 'Selected role was not found.' });
  }

  await Invitation.updateMany(
    { email: normalizedEmail, status: 'pending' },
    { $set: { status: 'cancelled' } }
  );

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await Invitation.create({
    email: normalizedEmail,
    fullName,
    jobTitle,
    role,
    permissions: Array.isArray(permissions) ? permissions : [],
    invitedBy: req.user._id,
    token,
    expiresAt
  });

  const emailResult = await sendInvitationEmail(invitation);
  invitation.emailStatus = emailResult.status;
  invitation.emailError = emailResult.error;
  await invitation.save();

  const populatedInvitation = await Invitation.findById(invitation._id).populate(invitationPopulate);

  res.status(201).json({
    message: emailResult.sent
      ? 'Invitation created and email sent.'
      : 'Invitation created. Email is not fully configured yet.',
    invitation: populatedInvitation,
    inviteLink: getInviteLink(invitation.token),
    emailStatus: invitation.emailStatus,
    emailError: invitation.emailError
  });
}

async function verifyInvitation(req, res) {
  const invitation = await Invitation.findOne({ token: req.params.token }).populate(invitationPopulate);

  if (!invitation) {
    return res.status(404).json({ message: 'Invitation was not found.' });
  }

  if (invitation.status !== 'pending') {
    return res.status(400).json({ message: `Invitation is ${invitation.status}.` });
  }

  if (invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    return res.status(400).json({ message: 'Invitation has expired.' });
  }

  res.json({
    invitation: {
      email: invitation.email,
      fullName: invitation.fullName,
      jobTitle: invitation.jobTitle,
      role: invitation.role,
      expiresAt: invitation.expiresAt
    }
  });
}

module.exports = {
  listInvitations,
  createInvitation,
  verifyInvitation
};
