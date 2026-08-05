function hasPermission(user, resource, action) {
  const permissions = user.role && user.role.permissions ? user.role.permissions : [];

  return permissions.some((permission) => {
    const sameResource = permission.resource === resource;
    const canManage = permission.actions.includes('manage');
    const hasAction = permission.actions.includes(action);
    return sameResource && (canManage || hasAction);
  });
}

function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication is required.' });
    }

    if (!hasPermission(req.user, resource, action)) {
      return res.status(403).json({
        message: 'You do not have permission to perform this action.',
        required: { resource, action }
      });
    }

    next();
  };
}

module.exports = {
  hasPermission,
  requirePermission
};
