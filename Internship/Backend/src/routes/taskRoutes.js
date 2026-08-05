const express = require('express');
const {
  listTasks,
  getTaskById,
  updateTaskStatus
} = require('../controllers/taskController');
const requireAuth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.get('/', requireAuth, requirePermission('tasks', 'read'), listTasks);
router.get('/:id', requireAuth, requirePermission('tasks', 'read'), getTaskById);
router.patch('/:id/status', requireAuth, requirePermission('tasks', 'update'), updateTaskStatus);

module.exports = router;