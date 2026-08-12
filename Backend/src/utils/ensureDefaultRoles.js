const Role = require('../models/Role');

const defaults = [
  {
    name: 'Keeper', description: 'Can complete assigned tasks and submit evidence.', permissions: [
      { resource: 'tasks', actions: ['read', 'update'] },
      { resource: 'evidence', actions: ['create', 'read', 'update', 'upload'] },
      { resource: 'comments', actions: ['create', 'read'] },
      { resource: 'calendar', actions: ['read'] },
      { resource: 'animals', actions: ['read'] }
    ]
  },
  {
    name: 'Supervisor', description: 'Can assign tasks and review keeper work.', permissions: [
      { resource: 'tasks', actions: ['create', 'read', 'update', 'assign'] },
      { resource: 'evidence', actions: ['read', 'approve', 'return', 'escalate'] },
      { resource: 'comments', actions: ['create', 'read', 'update'] },
      { resource: 'mentions', actions: ['create', 'read', 'update'] },
      { resource: 'calendar', actions: ['create', 'read', 'update'] },
      { resource: 'animals', actions: ['read', 'update'] }
    ]
  },
  {
    name: 'Management', description: 'Can manage operations, users, reports, and approvals.', permissions: [
      { resource: 'users', actions: ['create', 'read', 'update', 'manage'] },
      { resource: 'tasks', actions: ['create', 'read', 'update', 'assign'] },
      { resource: 'evidence', actions: ['read', 'approve', 'return'] },
      { resource: 'comments', actions: ['create', 'read', 'update'] },
      { resource: 'mentions', actions: ['create', 'read', 'update'] },
      { resource: 'calendar', actions: ['create', 'read', 'update', 'manage'] },
      { resource: 'reports', actions: ['read', 'manage'] },
      { resource: 'ai', actions: ['read'] }
    ]
  },
  {
    name: 'Admin', description: 'Can manage all ZooOps users and operations.', permissions: [
      { resource: 'users', actions: ['create', 'read', 'update', 'delete', 'manage'] },
      { resource: 'roles', actions: ['create', 'read', 'update', 'delete', 'manage'] },
      { resource: 'tasks', actions: ['create', 'read', 'update', 'delete', 'assign', 'manage'] },
      { resource: 'evidence', actions: ['create', 'read', 'update', 'delete', 'approve', 'return', 'manage'] },
      { resource: 'comments', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'mentions', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'calendar', actions: ['create', 'read', 'update', 'delete', 'manage'] },
      { resource: 'animals', actions: ['create', 'read', 'update', 'delete', 'manage'] },
      { resource: 'enclosures', actions: ['create', 'read', 'update', 'delete', 'manage'] },
      { resource: 'reports', actions: ['read', 'manage'] },
      { resource: 'ai', actions: ['read', 'manage'] }
    ]
  }
];

async function ensureDefaultRoles() {
  await Promise.all(defaults.map((role) => Role.updateOne(
    { name: role.name },
    { $setOnInsert: role },
    { upsert: true }
  )));
}

module.exports = ensureDefaultRoles;
