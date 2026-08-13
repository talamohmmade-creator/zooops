const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const { listInvitations, createInvitation, verifyInvitation } = require('../controllers/invitationController');
const router = express.Router();
router.get('/verify/:token', verifyInvitation);
router.get('/', requireAuth, listInvitations);
router.post('/', requireAuth, createInvitation);
module.exports = router;
