import { prisma } from '../db';
import { createAuditEvent } from '../audit';
import { generateBlobKey, uploadFile, downloadFile, deleteFile } from './storage';
import { AuditEventType, UPLOAD_CONFIG } from '@request-tracker/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface AttachmentUploadResult {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface AttachmentDownloadResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateFileSize(sizeBytes: number): { valid: boolean; error?: string } {
  if (sizeBytes <= 0) {
    return { valid: false, error: 'File is empty' };
  }
  if (sizeBytes > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
    const maxMB = UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024);
    return { valid: false, error: `File exceeds maximum size of ${maxMB}MB` };
  }
  return { valid: true };
}

export function validateMimeType(mimeType: string): { valid: boolean; error?: string } {
  const allowed = UPLOAD_CONFIG.ALLOWED_MIME_TYPES as readonly string[];
  if (!allowed.includes(mimeType)) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not allowed. Allowed types: ${allowed.join(', ')}`,
    };
  }
  return { valid: true };
}

export function validateFile(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  if (!fileName || fileName.trim().length === 0) {
    return { valid: false, error: 'File name is required' };
  }

  const sizeCheck = validateFileSize(sizeBytes);
  if (!sizeCheck.valid) return sizeCheck;

  const mimeCheck = validateMimeType(mimeType);
  if (!mimeCheck.valid) return mimeCheck;

  return { valid: true };
}

// ============================================================================
// UPLOAD ATTACHMENT
// ============================================================================

export async function uploadAttachment(
  requestId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  actorUserId: string,
  stageId?: string | null
): Promise<AttachmentUploadResult> {
  // Validate file
  const validation = validateFile(fileName, mimeType, buffer.length);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Verify the request exists
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { id: true, currentStageId: true },
  });
  if (!request) {
    throw new Error('Request not found');
  }

  // Use provided stageId, or fall back to the request's current stage
  const effectiveStageId = stageId ?? request.currentStageId;

  // Generate blob key and upload
  const blobKey = generateBlobKey(requestId, fileName);
  await uploadFile(blobKey, buffer, mimeType);

  // Create database record
  const attachment = await prisma.attachment.create({
    data: {
      requestId,
      stageId: effectiveStageId,
      blobKey,
      fileName,
      mimeType,
      sizeBytes: BigInt(buffer.length),
      uploadedByUserId: actorUserId,
    },
  });

  // Create audit event
  await createAuditEvent(AuditEventType.ATTACHMENT_ADDED, actorUserId, requestId, {
    attachmentId: attachment.id,
    fileName,
    mimeType,
    sizeBytes: buffer.length,
    stageId: effectiveStageId,
  });

  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: Number(attachment.sizeBytes),
    createdAt: attachment.createdAt.toISOString(),
  };
}

// ============================================================================
// DOWNLOAD ATTACHMENT
// ============================================================================

export async function downloadAttachment(
  attachmentId: string
): Promise<AttachmentDownloadResult | null> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      blobKey: true,
      fileName: true,
      mimeType: true,
      requestId: true,
    },
  });

  if (!attachment) {
    return null;
  }

  const { buffer, exists } = await downloadFile(attachment.blobKey);
  if (!exists) {
    return null;
  }

  return {
    buffer,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
  };
}

// ============================================================================
// GET ATTACHMENT METADATA
// ============================================================================

export async function getAttachmentMeta(attachmentId: string) {
  return prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      requestId: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      uploadedByUserId: true,
      createdAt: true,
    },
  });
}

// ============================================================================
// DELETE ATTACHMENT
// ============================================================================

export async function removeAttachment(
  attachmentId: string,
  actorUserId: string
): Promise<boolean> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      blobKey: true,
      fileName: true,
      requestId: true,
    },
  });

  if (!attachment) {
    return false;
  }

  // Delete from storage
  await deleteFile(attachment.blobKey);

  // Delete from database
  await prisma.attachment.delete({
    where: { id: attachmentId },
  });

  // Create audit event
  await createAuditEvent(AuditEventType.ATTACHMENT_REMOVED, actorUserId, attachment.requestId, {
    attachmentId: attachment.id,
    fileName: attachment.fileName,
  });

  return true;
}

// ============================================================================
// LIST ATTACHMENTS FOR REQUEST
// ============================================================================

export async function listAttachments(requestId: string) {
  const attachments = await prisma.attachment.findMany({
    where: { requestId },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: { select: { id: true, email: true } },
      stage: { select: { id: true, name: true } },
    },
  });

  return attachments.map((a) => ({
    id: a.id,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: Number(a.sizeBytes),
    createdAt: a.createdAt.toISOString(),
    uploadedBy: a.uploadedBy,
    stageId: a.stageId ?? null,
    stageName: a.stage?.name ?? null,
  }));
}
