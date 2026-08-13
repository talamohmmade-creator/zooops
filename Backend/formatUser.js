function formatUser(user) {
  const activeTemporaryPermissions = (user.temporaryPermissions || []).filter((grant) => grant.expiresAt > new Date());
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    jobTitle: user.jobTitle,
    active: user.active,
    role: user.role
      ? {
          id: user.role._id,
          name: user.role.name,
          description: user.role.description,
          permissions: user.role.permissions || []
        }
      : null,
    assignedZones: user.assignedZones || [],
    assignedEnclosures: user.assignedEnclosures || [],
    customPermissions: [...new Set([...(user.customPermissions || []), ...activeTemporaryPermissions.map((grant) => grant.permission)])],
    temporaryPermissions: activeTemporaryPermissions
  };
}

module.exports = formatUser;
