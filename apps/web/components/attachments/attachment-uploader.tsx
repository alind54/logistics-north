'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@request-tracker/ui';
import { UPLOAD_CONFIG } from '@request-tracker/shared';

interface AttachmentUploaderProps {
  requestId: string;
}

export function AttachmentUploader({ requestId }: AttachmentUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setError(null);

    // Client-side validation
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES) {
      setError(`File exceeds maximum size of ${UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
      return;
    }

    const allowed = UPLOAD_CONFIG.ALLOWED_MIME_TYPES as readonly string[];
    if (!allowed.includes(file.type)) {
      setError('File type not allowed');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/requests/${requestId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message || 'Upload failed');
      }
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={[...UPLOAD_CONFIG.ALLOWED_MIME_TYPES].join(',')}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : 'Upload File'}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Max {UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB. Allowed: images, PDF, Word, Excel, text, CSV.
      </p>
    </div>
  );
}
