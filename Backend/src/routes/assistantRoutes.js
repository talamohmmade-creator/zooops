const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { askAssistant } = require('../controllers/assistantController');
const router = express.Router();
router.post('/ask', requireAuth, requirePermission('tasks', 'read'), askAssistant);
module.exports = router;
