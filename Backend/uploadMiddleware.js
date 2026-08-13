const multer = require('multer');
const mongoose = require('mongoose');

function getFileType(file) {
  if (file.mimetype.startsWith('image/')) return 'photo';
  if (file.mimetype.startsWith('video/')) return 'video';
  if (file.mimetype === 'application/pdf') return 'pdf';
  if (file.mimetype.includes('word') || file.mimetype.includes('excel') || file.mimetype.includes('powerpoint') || file.mimetype.includes('text')) return 'document';
  return 'other';
}

function getBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'evidenceFiles' });
}

async function fileToEvidenceFile(file, userId, req) {
  const bucket = getBucket();
  const uploadStream = bucket.openUploadStream(file.originalname, {
    contentType: file.mimetype,
    metadata: { uploadedBy: userId.toString() }
  });
  await new Promise((resolve, reject) => {
    uploadStream.on('error', reject);
    uploadStream.on('finish', resolve);
    uploadStream.end(file.buffer);
  });
  return {
    fileType: getFileType(file),
    fileName: file.originalname,
    url: `${(process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')}/api/files/${uploadStream.id}`,
    storageKey: uploadStream.id.toString(),
    uploadedBy: userId
  };
}

const uploadEvidenceFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 }
});

module.exports = { uploadEvidenceFiles, fileToEvidenceFile, getBucket };
