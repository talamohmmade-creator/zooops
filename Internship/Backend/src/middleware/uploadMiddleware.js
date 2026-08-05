const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const taskId = req.body.task || req.params.id || 'general';
    const destination = path.join(uploadRoot, taskId);

    fs.mkdirSync(destination, { recursive: true });
    cb(null, destination);
  },
  filename(req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

function getFileType(file) {
  if (file.mimetype.startsWith('image/')) return 'photo';
  if (file.mimetype.startsWith('video/')) return 'video';
  if (file.mimetype === 'application/pdf') return 'pdf';
  if (
    file.mimetype.includes('word') ||
    file.mimetype.includes('excel') ||
    file.mimetype.includes('powerpoint') ||
    file.mimetype.includes('text')
  ) {
    return 'document';
  }

  return 'other';
}

function fileToEvidenceFile(file, userId, req) {
  const relativePath = path.relative(uploadRoot, file.path).replace(/\\/g, '/');

  return {
    fileType: getFileType(file),
    fileName: file.originalname,
    url: `${req.protocol}://${req.get('host')}/uploads/${relativePath}`,
    storageKey: relativePath,
    uploadedBy: userId
  };
}

const uploadEvidenceFiles = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 10
  }
});

module.exports = {
  uploadEvidenceFiles,
  fileToEvidenceFile
};
