const crypto = require('crypto');
const path = require('path');

const extractS3Key = (imageUrl) => {
  if (!imageUrl) return null;
  const prefix = '/api/files/';
  const idx = imageUrl.indexOf(prefix);
  return idx !== -1 ? imageUrl.substring(idx + prefix.length) : null;
};

const generateS3Key = (folder, originalname) => {
  const ext = path.extname(originalname || '').toLowerCase();
  return `${folder}/${Date.now()}-${crypto.randomUUID()}${ext}`;
};

module.exports = { extractS3Key, generateS3Key };
