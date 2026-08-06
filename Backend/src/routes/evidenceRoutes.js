const express = require('express');
const router = express.Router();

const evidenceController = require('../controllers/evidenceController');
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, evidenceController.getEvidence);

router.post(
  '/',
  protect,
  upload.array('files', 10),
  evidenceController.createEvidence
);

router.patch(
  '/:id/status',
  protect,
  evidenceController.updateEvidenceStatus
);

module.exports = router;
