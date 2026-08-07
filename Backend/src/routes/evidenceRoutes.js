const express = require('express');
const evidenceController = require('../controllers/evidenceController');
const requireAuth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { uploadEvidenceFiles } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  requirePermission('evidence', 'read'),
  evidenceController.getEvidence
);

router.post(
  '/',
  requireAuth,
  requirePermission('evidence', 'create'),
  uploadEvidenceFiles.array('files', 10),
  evidenceController.createEvidence
);

router.patch(
  '/:id/status',
  requireAuth,
  evidenceController.updateEvidenceStatus
);

module.exports = router;