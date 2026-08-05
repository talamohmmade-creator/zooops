const express = require('express');
const {
  listInvitations,
  createInvitation,
  verifyInvitation
} = require('../controllers/invitationController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, listInvitations);
router.post('/', requireAuth, createInvitation);
router.get('/verify/:token', verifyInvitation);

module.exports = router;
