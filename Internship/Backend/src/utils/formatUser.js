function formatUser(user) {
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
    assignedEnclosures: user.assignedEnclosures || []
  };
}

module.exports = formatUser;
