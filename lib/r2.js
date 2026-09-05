import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

const r2Endpoint = process.env.R2_ENDPOINT || 'https://96fc7ee23dc6bd77e170a174c6272736.r2.cloudflarestorage.com';
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '02480715ed53ebb43305414ee1036dba';
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const r2BucketName = process.env.R2_BUCKET_NAME || 'epassbook';
const r2PublicUrl = (process.env.R2_PUBLIC_URL || 'https://pub-0dfa6598598b48449444282932df49d0.r2.dev').replace(/\/$/, '');

/**
 * Singleton S3 client configured for Cloudflare R2
 */
let cachedClient = null;

export function getR2Client() {
  if (!r2SecretAccessKey) {
    throw new Error('R2_SECRET_ACCESS_KEY is not configured in .env. Please configure your Cloudflare R2 Secret Access Key.');
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });
  }

  return cachedClient;
}

/**
 * Upload an image buffer directly to Cloudflare R2 bucket.
 *
 * @param {Object} params
 * @param {Buffer} params.buffer - File buffer
 * @param {string} params.mimeType - Content type (e.g. image/jpeg)
 * @param {string} [params.originalName] - Original file name
 * @param {string} [params.folder] - Target folder in bucket (default 'receipts')
 * @param {string} [params.userId] - User ID for partitioned storage
 * @returns {Promise<{ key: string, url: string, bucket: string }>}
 */
export async function uploadToR2({
  buffer,
  mimeType = 'image/jpeg',
  originalName = 'image.jpg',
  folder = 'receipts',
  userId = 'general',
}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid buffer provided for R2 upload.');
  }

  const client = getR2Client();

  // Extract or deduce extension
  const rawExt = originalName.includes('.')
    ? originalName.split('.').pop()
    : (mimeType.split('/')[1] || 'jpg');
  const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

  const randomId = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  const safeName = `${Date.now()}-${randomId}.${cleanExt}`;
  const key = `${folder}/${userId}/${safeName}`;

  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await client.send(command);

  const publicUrl = `${r2PublicUrl}/${key}`;

  return {
    key,
    url: publicUrl,
    bucket: r2BucketName,
  };
}
