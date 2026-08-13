const mongoose = require('mongoose');
const { getBucket } = require('../middleware/uploadMiddleware');

async function streamFile(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'File not found.' });
  const id = new mongoose.Types.ObjectId(req.params.id);
  const files = await getBucket().find({ _id: id }).limit(1).toArray();
  const file = files[0];
  if (!file) return res.status(404).json({ message: 'This file is missing. Please upload it again.' });
  res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
  res.setHeader('Content-Length', file.length);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Content-Disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${String(file.filename).replace(/["\r\n]/g, '')}"`);
  getBucket().openDownloadStream(id).on('error', () => {
    if (!res.headersSent) res.status(404).json({ message: 'File not found.' });
    else res.end();
  }).pipe(res);
}

module.exports = { streamFile };
