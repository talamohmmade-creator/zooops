const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { listTeam, updatePermissions } = require('../controllers/userController');
const router = express.Router();
router.get('/', requireAuth, requirePermission('users', 'read'), listTeam);
router.patch('/:id/permissions', requireAuth, requirePermission('users', 'manage'), updatePermissions);
module.exports = router;
