const crypto = require('crypto');
const path = require('path');

const extractS3Key = (imageUrl) => {
  if (!imageUrl) return null;
  const prefix = '/api/files/';
  const idx = imageUrl.indexOf(prefix);
  return idx !== -1 ? imageUrl.substring(idx + prefix.length) : null;
};

// Extensión por tipo MIME, para archivos cuyo nombre original no la lleva
// (p. ej. un Blob adjuntado sin nombre llega a multer como "blob").
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/avif': '.avif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf'
};

// Deriva la extensión del archivo: usa la del nombre original o, si no tiene,
// la deriva del mimetype. Sin extensión la key de S3 sigue siendo válida
// (el Content-Type viaja en los metadatos), pero la pierde al descargarse.
const getFileExtension = (originalname, mimetype) => {
  const ext = path.extname(originalname || '');
  if (ext) return ext.toLowerCase();
  return MIME_TO_EXT[mimetype] || '';
};

const generateS3Key = (folder, originalname, mimetype) => {
  const ext = getFileExtension(originalname, mimetype);
  return `${folder}/${Date.now()}-${crypto.randomUUID()}${ext}`;
};

module.exports = { extractS3Key, generateS3Key, getFileExtension };
