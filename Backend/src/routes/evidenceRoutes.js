const express = require('express');
const {
  listEvidence,
  getEvidenceById,
  createEvidence,
  updateEvidence,
  submitEvidence,
  updateEvidenceStatus
} = require('../controllers/evidenceController');
const requireAuth = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { uploadEvidenceFiles } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', requireAuth, requirePermission('evidence', 'read'), listEvidence);
router.get('/:id', requireAuth, requirePermission('evidence', 'read'), getEvidenceById);
router.post('/', requireAuth, requirePermission('evidence', 'create'), uploadEvidenceFiles.array('files', 10), createEvidence);
router.patch('/:id', requireAuth, requirePermission('evidence', 'update'), uploadEvidenceFiles.array('files', 10), updateEvidence);
router.patch('/:id/submit', requireAuth, requirePermission('evidence', 'update'), submitEvidence);
router.patch('/:id/status', requireAuth, updateEvidenceStatus);

module.exports = router;
