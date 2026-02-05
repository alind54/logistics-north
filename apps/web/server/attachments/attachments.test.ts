import { describe, it, expect } from 'vitest';
import { validateFile, validateFileSize, validateMimeType } from './index';
import { UPLOAD_CONFIG } from '@request-tracker/shared';
import { hasPermission } from '../auth/rbac';
import type { Permission } from '../auth/rbac';

// ============================================================================
// FILE VALIDATION TESTS
// ============================================================================

describe('File Validation', () => {
  describe('validateFileSize', () => {
    it('should accept a valid file size', () => {
      const result = validateFileSize(1024); // 1 KB
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty file (0 bytes)', () => {
      const result = validateFileSize(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File is empty');
    });

    it('should reject negative file size', () => {
      const result = validateFileSize(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File is empty');
    });

    it('should accept file at max size', () => {
      const result = validateFileSize(UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES);
      expect(result.valid).toBe(true);
    });

    it('should reject file exceeding max size', () => {
      const result = validateFileSize(UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES + 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum size');
      expect(result.error).toContain('10MB');
    });

    it('should accept 1-byte file', () => {
      const result = validateFileSize(1);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateMimeType', () => {
    it.each(UPLOAD_CONFIG.ALLOWED_MIME_TYPES)('should accept allowed MIME type: %s', (mime) => {
      const result = validateMimeType(mime);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject executable MIME type', () => {
      const result = validateMimeType('application/x-executable');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject HTML file', () => {
      const result = validateMimeType('text/html');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject JavaScript file', () => {
      const result = validateMimeType('application/javascript');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject empty MIME type', () => {
      const result = validateMimeType('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should include allowed types in error message', () => {
      const result = validateMimeType('video/mp4');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('image/jpeg');
      expect(result.error).toContain('application/pdf');
    });
  });

  describe('validateFile', () => {
    it('should accept valid file', () => {
      const result = validateFile('report.pdf', 'application/pdf', 1024);
      expect(result.valid).toBe(true);
    });

    it('should reject empty filename', () => {
      const result = validateFile('', 'application/pdf', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File name is required');
    });

    it('should reject whitespace-only filename', () => {
      const result = validateFile('   ', 'application/pdf', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File name is required');
    });

    it('should reject invalid size before checking MIME type', () => {
      const result = validateFile('file.pdf', 'application/pdf', 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File is empty');
    });

    it('should reject invalid MIME type after size check passes', () => {
      const result = validateFile('file.exe', 'application/x-executable', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should accept all valid combinations', () => {
      expect(validateFile('photo.jpg', 'image/jpeg', 5000).valid).toBe(true);
      expect(validateFile('doc.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024).valid).toBe(true);
      expect(validateFile('data.csv', 'text/csv', 100).valid).toBe(true);
    });
  });
});

// ============================================================================
// ATTACHMENT RBAC TESTS
// ============================================================================

describe('Attachment RBAC', () => {
  const attachmentPermissions: Permission[] = [
    'attachment:upload',
    'attachment:download',
    'attachment:delete',
  ];

  describe('ADMIN role', () => {
    it('should have all attachment permissions', () => {
      for (const perm of attachmentPermissions) {
        expect(hasPermission('ADMIN', perm)).toBe(true);
      }
    });
  });

  describe('MANAGER role', () => {
    it('should be able to upload attachments', () => {
      expect(hasPermission('MANAGER', 'attachment:upload')).toBe(true);
    });

    it('should be able to download attachments', () => {
      expect(hasPermission('MANAGER', 'attachment:download')).toBe(true);
    });

    it('should be able to delete attachments', () => {
      expect(hasPermission('MANAGER', 'attachment:delete')).toBe(true);
    });
  });

  describe('OPERATOR role', () => {
    it('should be able to upload attachments', () => {
      expect(hasPermission('OPERATOR', 'attachment:upload')).toBe(true);
    });

    it('should be able to download attachments', () => {
      expect(hasPermission('OPERATOR', 'attachment:download')).toBe(true);
    });

    it('should NOT be able to delete attachments', () => {
      expect(hasPermission('OPERATOR', 'attachment:delete')).toBe(false);
    });
  });

  describe('VIEWER role', () => {
    it('should NOT be able to upload attachments', () => {
      expect(hasPermission('VIEWER', 'attachment:upload')).toBe(false);
    });

    it('should be able to download attachments', () => {
      expect(hasPermission('VIEWER', 'attachment:download')).toBe(true);
    });

    it('should NOT be able to delete attachments', () => {
      expect(hasPermission('VIEWER', 'attachment:delete')).toBe(false);
    });
  });
});
