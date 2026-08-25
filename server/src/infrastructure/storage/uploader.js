const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const { env } = require('../../config/env');
const { AppError } = require('../../shared/errors');

fs.mkdirSync(env.uploads.dir, { recursive: true });

const disk = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploads.dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${uuid()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (!allowed.includes(file.mimetype)) {
    cb(new AppError('Only JPEG, PNG, WEBP, GIF or PDF files are allowed', 415));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage: process.env.VERCEL ? multer.memoryStorage() : disk,
  fileFilter,
  limits: {
    fileSize: env.uploads.maxFileSizeMb * 1024 * 1024,
    files: env.uploads.maxFiles,
  },
});

module.exports = { upload };
