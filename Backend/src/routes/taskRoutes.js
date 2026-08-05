const express = require('express');
const {
  listTasks,
  getTaskById,
  getTaskOptions,
  createTask,
  updateTaskStatus
} = require('../controllers/taskController');
const requireAuth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.get('/options', requireAuth, requirePermission('tasks', 'read'), getTaskOptions);
router.get('/', requireAuth, requirePermission('tasks', 'read'), listTasks);
router.post('/', requireAuth, createTask);
router.get('/:id', requireAuth, requirePermission('tasks', 'read'), getTaskById);
router.patch('/:id/status', requireAuth, requirePermission('tasks', 'update'), updateTaskStatus);

module.exports = router;
