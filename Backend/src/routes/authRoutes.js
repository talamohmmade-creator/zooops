const express = require('express');
const {
  login,
  setupManager,
  registerFromInvite,
  googleStart,
  googleCallback,
  getMe,
  permissionCheck
} = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/setup-manager', setupManager);
router.post('/register-from-invite', registerFromInvite);
router.get('/google', googleStart);
router.get('/google/callback', googleCallback);
router.get('/me', requireAuth, getMe);
router.get('/permission-test', requireAuth, requirePermission('tasks', 'read'), permissionCheck);

module.exports = router;
