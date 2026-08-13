const express = require('express');
const { streamFile } = require('../controllers/fileController');
const router = express.Router();
router.get('/:id', streamFile);
module.exports = router;
