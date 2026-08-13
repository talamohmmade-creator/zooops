const express = require('express');
const {
  listTasks,
  getTaskOptions,
  createTask,
  getTaskById,
  updateTaskStatus
} = require('../controllers/taskController');
const requireAuth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.get('/options', requireAuth, getTaskOptions);
router.get('/', requireAuth, requirePermission('tasks', 'read'), listTasks);
router.post('/', requireAuth, requirePermission('tasks', 'create'), createTask);
router.get('/:id', requireAuth, requirePermission('tasks', 'read'), getTaskById);
router.patch('/:id/status', requireAuth, requirePermission('tasks', 'update'), updateTaskStatus);

module.exports = router;
