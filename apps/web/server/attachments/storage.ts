import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Storage abstraction for file attachments.
 * Supports three backends via STORAGE_PROVIDER env var:
 * - "local" (default): Local filesystem in /uploads
 * - "s3": AWS S3 or S3-compatible (requires @aws-sdk/client-s3)
 * - "vercel-blob": Vercel Blob storage (requires @vercel/blob)
 *
 * Configure with environment variables:
 *   STORAGE_PROVIDER=local|s3|vercel-blob
 *   S3_BUCKET=bucket-name
 *   S3_REGION=us-east-1
 *   S3_ACCESS_KEY_ID=...
 *   S3_SECRET_ACCESS_KEY=...
 *   S3_ENDPOINT=... (optional, for S3-compatible services)
 *   BLOB_READ_WRITE_TOKEN=... (for Vercel Blob)
 */

type StorageProvider = 'local' | 's3' | 'vercel-blob';

function getProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? 'local';
  if (provider === 's3' || provider === 'vercel-blob') return provider;
  return 'local';
}

// ============================================================================
// Shared API
// ============================================================================

export function generateBlobKey(requestId: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const id = crypto.randomUUID();
  return `attachments/${requestId}/${id}_${sanitized}`;
}

export async function uploadFile(
  blobKey: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const provider = getProvider();
  switch (provider) {
    case 's3':
      return s3Upload(blobKey, buffer, mimeType);
    case 'vercel-blob':
      return vercelBlobUpload(blobKey, buffer, mimeType);
    default:
      return localUpload(blobKey, buffer);
  }
}

export async function downloadFile(
  blobKey: string
): Promise<{ buffer: Buffer; exists: boolean }> {
  const provider = getProvider();
  switch (provider) {
    case 's3':
      return s3Download(blobKey);
    case 'vercel-blob':
      return vercelBlobDownload(blobKey);
    default:
      return localDownload(blobKey);
  }
}

export async function deleteFile(blobKey: string): Promise<boolean> {
  const provider = getProvider();
  switch (provider) {
    case 's3':
      return s3Delete(blobKey);
    case 'vercel-blob':
      return vercelBlobDelete(blobKey);
    default:
      return localDelete(blobKey);
  }
}

// ============================================================================
// Local Filesystem
// ============================================================================

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function localUpload(blobKey: string, buffer: Buffer): Promise<string> {
  const filePath = path.join(UPLOAD_DIR, blobKey);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, buffer);
  return blobKey;
}

async function localDownload(blobKey: string): Promise<{ buffer: Buffer; exists: boolean }> {
  const filePath = path.join(UPLOAD_DIR, blobKey);
  try {
    const buffer = await fs.readFile(filePath);
    return { buffer, exists: true };
  } catch {
    return { buffer: Buffer.alloc(0), exists: false };
  }
}

async function localDelete(blobKey: string): Promise<boolean> {
  const filePath = path.join(UPLOAD_DIR, blobKey);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// AWS S3 (requires @aws-sdk/client-s3)
// ============================================================================

async function s3Upload(blobKey: string, buffer: Buffer, mimeType: string): Promise<string> {
  try {
    // @ts-ignore - optional dependency
    const { S3Client, PutObjectCommand } = await import(/* webpackIgnore: true */ '@aws-sdk/client-s3');
    const client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET ?? '',
        Key: blobKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return blobKey;
  } catch (error) {
    logger.error('S3 upload failed', error as Error);
    throw new Error('Storage upload failed');
  }
}

async function s3Download(blobKey: string): Promise<{ buffer: Buffer; exists: boolean }> {
  try {
    // @ts-ignore - optional dependency
    const { S3Client, GetObjectCommand } = await import(/* webpackIgnore: true */ '@aws-sdk/client-s3');
    const client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
    const response = await client.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET ?? '',
        Key: blobKey,
      })
    );
    const bodyBytes = await response.Body?.transformToByteArray();
    return { buffer: Buffer.from(bodyBytes ?? []), exists: true };
  } catch {
    return { buffer: Buffer.alloc(0), exists: false };
  }
}

async function s3Delete(blobKey: string): Promise<boolean> {
  try {
    // @ts-ignore - optional dependency
    const { S3Client, DeleteObjectCommand } = await import(/* webpackIgnore: true */ '@aws-sdk/client-s3');
    const client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET ?? '',
        Key: blobKey,
      })
    );
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Vercel Blob (requires @vercel/blob)
// ============================================================================

async function vercelBlobUpload(blobKey: string, buffer: Buffer, _mimeType: string): Promise<string> {
  try {
    // @ts-ignore - optional dependency
    const { put } = await import(/* webpackIgnore: true */ '@vercel/blob');
    const blob = await put(blobKey, buffer, { access: 'public' });
    return blob.url;
  } catch (error) {
    logger.error('Vercel Blob upload failed', error as Error);
    throw new Error('Storage upload failed');
  }
}

async function vercelBlobDownload(blobKey: string): Promise<{ buffer: Buffer; exists: boolean }> {
  try {
    // blobKey for Vercel Blob is the full URL
    const response = await fetch(blobKey);
    if (!response.ok) return { buffer: Buffer.alloc(0), exists: false };
    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), exists: true };
  } catch {
    return { buffer: Buffer.alloc(0), exists: false };
  }
}

async function vercelBlobDelete(blobKey: string): Promise<boolean> {
  try {
    // @ts-ignore - optional dependency
    const { del } = await import(/* webpackIgnore: true */ '@vercel/blob');
    await del(blobKey);
    return true;
  } catch {
    return false;
  }
}
