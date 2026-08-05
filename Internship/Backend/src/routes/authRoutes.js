const express = require('express');
const {
  login,
  getMe,
  permissionCheck
} = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.get('/permission-test', requireAuth, requirePermission('tasks', 'read'), permissionCheck);

module.exports = router;
