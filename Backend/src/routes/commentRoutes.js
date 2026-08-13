const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { listComments, createComment } = require('../controllers/commentController');
const router = express.Router();
router.get('/', requireAuth, requirePermission('comments', 'read'), listComments);
router.post('/', requireAuth, requirePermission('comments', 'create'), createComment);
module.exports = router;
