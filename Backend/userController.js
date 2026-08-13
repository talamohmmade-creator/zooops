const { User } = require('../models');
const formatUser = require('../utils/formatUser');

const allowedCustomPermissions = new Set(['calendar.create']);

async function listTeam(req, res) {
  const users = await User.find({ active: true }).populate('role').sort({ fullName: 1 });
  res.json({ users: users.map(formatUser) });
}

async function updatePermissions(req, res) {
  if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: 'Use another manager account to change your own access.' });
  const user = await User.findById(req.params.id).populate('role');
  if (!user) return res.status(404).json({ message: 'Team member not found.' });
  const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
  if (permissions.some((value) => !allowedCustomPermissions.has(value))) return res.status(400).json({ message: 'One or more permissions are not allowed.' });
  const preservedPermissions = (user.customPermissions || []).filter((value) => !allowedCustomPermissions.has(value));
  user.customPermissions = [...new Set([...preservedPermissions, ...permissions])];
  await user.save();
  await user.populate('role');
  res.json({ message: 'Permissions updated.', user: formatUser(user) });
}

module.exports = { listTeam, updatePermissions };
