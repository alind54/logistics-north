'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@request-tracker/ui';
import type { AttachmentDTO } from '@request-tracker/shared';

interface AttachmentListProps {
  attachments: AttachmentDTO[];
  canDelete: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'IMG';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word')) return 'DOC';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLS';
  if (mimeType.startsWith('text/')) return 'TXT';
  return 'FILE';
}

export function AttachmentList({ attachments, canDelete }: AttachmentListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDownload = (attachmentId: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = `/api/attachments/${attachmentId}/download`;
    link.download = fileName;
    link.click();
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    setDeletingId(attachmentId);
    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">No attachments</p>;
  }

  return (
    <ul className="space-y-2">
      {attachments.map((att) => (
        <li
          key={att.id}
          className="flex items-center justify-between rounded-md border px-3 py-2"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-muted text-xs font-bold">
              {getFileIcon(att.mimeType)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{att.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(att.sizeBytes)} &middot; {att.uploadedBy.email.split('@')[0]} &middot;{' '}
                {new Date(att.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleDownload(att.id, att.fileName)}
            >
              Download
            </Button>
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => handleDelete(att.id)}
                disabled={deletingId === att.id}
              >
                {deletingId === att.id ? '...' : 'Delete'}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
