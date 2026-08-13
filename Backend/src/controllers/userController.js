const { User } = require('../models');
const formatUser = require('../utils/formatUser');

const resources = new Set(['users', 'roles', 'animals', 'enclosures', 'tasks', 'evidence', 'comments', 'mentions', 'calendar', 'reports', 'ai']);
const actions = new Set(['create', 'read', 'update', 'delete', 'assign', 'approve', 'return', 'escalate', 'upload', 'manage']);
const isAllowedPermission = (value) => {
  const [resource, action, ...rest] = String(value || '').split('.');
  return rest.length === 0 && resources.has(resource) && actions.has(action);
};

async function listTeam(req, res) {
  const users = await User.find({ active: true }).populate('role').sort({ fullName: 1 });
  res.json({ users: users.map(formatUser) });
}

async function updatePermissions(req, res) {
  if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: 'Use another manager account to change your own access.' });
  const user = await User.findById(req.params.id).populate('role');
  if (!user) return res.status(404).json({ message: 'Team member not found.' });
  const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
  const temporaryPermissions = Array.isArray(req.body.temporaryPermissions) ? req.body.temporaryPermissions : [];
  if (permissions.some((value) => !isAllowedPermission(value))) return res.status(400).json({ message: 'One or more permissions are not allowed.' });
  if (temporaryPermissions.some((grant) => !isAllowedPermission(grant.permission) || !grant.expiresAt || Number.isNaN(new Date(grant.expiresAt).getTime()))) return res.status(400).json({ message: 'One or more temporary permissions are invalid.' });
  user.customPermissions = [...new Set(permissions)];
  user.temporaryPermissions = temporaryPermissions.map((grant) => ({ permission: grant.permission, expiresAt: new Date(grant.expiresAt) }));
  await user.save();
  await user.populate('role');
  res.json({ message: 'Permissions updated.', user: formatUser(user) });
}

module.exports = { listTeam, updatePermissions };
