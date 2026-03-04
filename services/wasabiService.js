const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

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

const getPublicUrl = (key) => {
  const endpoint = process.env.WASABI_ENDPOINT || 'https://s3.us-east-1.wasabisys.com';
  return `${endpoint}/${BUCKET}/${key}`;
};

const uploadFile = async (buffer, key, mimetype) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    ACL: 'public-read'
  });

  await s3Client.send(command);
  return getPublicUrl(key);
};

const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key
  });

  await s3Client.send(command);
};

const listFiles = async (prefix) => {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix
  });

  const response = await s3Client.send(command);
  return (response.Contents || []).map(item => ({
    key: item.Key,
    url: getPublicUrl(item.Key),
    size: item.Size,
    lastModified: item.LastModified
  }));
};

module.exports = { uploadFile, deleteFile, listFiles, getPublicUrl };
