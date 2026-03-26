const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  endpoint: process.env.WASABI_ENDPOINT || 'https://s3.us-east-1.wasabisys.com',
  region: process.env.WASABI_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY,
    secretAccessKey: process.env.WASABI_SECRET_KEY
  },
  forcePathStyle: true
});

const BUCKET = process.env.WASABI_BUCKET_UPLOADS || 'dig-ssgg-uploads';
const BUCKET_BACKUPS = process.env.WASABI_BUCKET_BACKUPS || 'dig-ssgg-backups';

// Retorna URL proxy del backend: /api/files/{key}
const getProxyUrl = (key) => {
  return `/api/files/${key}`;
};

const uploadFile = async (buffer, key, mimetype) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype
  });

  await s3Client.send(command);
  return getProxyUrl(key);
};

const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key
  });

  await s3Client.send(command);
};

const getFile = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key
  });

  return await s3Client.send(command);
};

const listFiles = async (prefix) => {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix
  });

  const response = await s3Client.send(command);
  return (response.Contents || []).map(item => ({
    key: item.Key,
    url: getProxyUrl(item.Key),
    size: item.Size,
    lastModified: item.LastModified
  }));
};

// ── Funciones para el bucket de BACKUPS ──

const uploadBackup = async (buffer, key, mimetype) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_BACKUPS,
    Key: key,
    Body: buffer,
    ContentType: mimetype
  });
  await s3Client.send(command);
};

const getBackup = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_BACKUPS,
    Key: key
  });
  return await s3Client.send(command);
};

const listBackups = async (prefix) => {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_BACKUPS,
    Prefix: prefix
  });
  const response = await s3Client.send(command);
  return (response.Contents || []).map(item => ({
    key: item.Key,
    size: item.Size,
    lastModified: item.LastModified
  }));
};

const deleteBackup = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_BACKUPS,
    Key: key
  });
  await s3Client.send(command);
};

module.exports = {
  uploadFile, deleteFile, getFile, listFiles, getProxyUrl,
  uploadBackup, getBackup, listBackups, deleteBackup
};
