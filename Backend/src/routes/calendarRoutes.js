const express = require('express');
const requireAuth = require('../middleware/authMiddleware');
const { getCalendar, createReminder, deleteReminder } = require('../controllers/calendarController');
const router = express.Router();
router.get('/', requireAuth, getCalendar);
router.post('/reminders', requireAuth, createReminder);
router.delete('/reminders/:id', requireAuth, deleteReminder);
module.exports = router;
