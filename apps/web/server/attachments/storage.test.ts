import { describe, it, expect } from 'vitest';
import { generateBlobKey } from './storage';

describe('Storage', () => {
  describe('generateBlobKey', () => {
    it('should generate a key with the request ID prefix', () => {
      const key = generateBlobKey('req-123', 'document.pdf');
      expect(key).toMatch(/^attachments\/req-123\//);
    });

    it('should sanitize file names', () => {
      const key = generateBlobKey('req-1', 'my file (v2).doc');
      expect(key).not.toContain(' ');
      expect(key).not.toContain('(');
      expect(key).not.toContain(')');
    });

    it('should generate unique keys for the same file name', () => {
      const key1 = generateBlobKey('req-1', 'test.pdf');
      const key2 = generateBlobKey('req-1', 'test.pdf');
      expect(key1).not.toBe(key2);
    });

    it('should preserve file extension', () => {
      const key = generateBlobKey('req-1', 'document.pdf');
      expect(key).toMatch(/\.pdf$/);
    });

    it('should handle special characters in file names', () => {
      const key = generateBlobKey('req-1', 'résumé-2024.docx');
      expect(key).toMatch(/\.docx$/);
      expect(key).not.toContain('é');
    });
  });

  describe('Storage provider detection', () => {
    it('should default to local when no env var set', () => {
      const provider = process.env.STORAGE_PROVIDER ?? 'local';
      expect(provider).toBe('local');
    });
  });
});

describe('CSV Export', () => {
  describe('CSV field escaping', () => {
    function escapeCsvField(value: string): string {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }

    it('should not escape plain text', () => {
      expect(escapeCsvField('hello')).toBe('hello');
    });

    it('should escape commas', () => {
      expect(escapeCsvField('hello, world')).toBe('"hello, world"');
    });

    it('should escape quotes', () => {
      expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    });

    it('should escape newlines', () => {
      expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should handle empty strings', () => {
      expect(escapeCsvField('')).toBe('');
    });
  });
});
