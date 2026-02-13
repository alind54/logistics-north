import { useState } from 'react';
import { FileText, Image, File, Download, Trash2, Loader2 } from 'lucide-react';
import type { Attachment } from '../../types';
import RoleGate from '../auth/RoleGate';

interface Props {
  attachments: Attachment[];
  onDelete: (id: string, storagePath: string) => void;
  onDownload: (storagePath: string) => Promise<string | null>;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="w-4 h-4 text-emerald-500" />;
  if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-blue-500" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentList({ attachments, onDelete, onDownload }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  const handleDownload = async (att: Attachment) => {
    setDownloading(att.id);
    const url = await onDownload(att.storage_path);
    if (url) window.open(url, '_blank');
    setDownloading(null);
  };

  return (
    <div className="space-y-1.5">
      {attachments.map(att => (
        <div key={att.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
          {getFileIcon(att.mime_type)}
          <span className="flex-1 truncate text-gray-700">{att.file_name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(att.file_size)}</span>
          <button
            onClick={() => handleDownload(att)}
            disabled={downloading === att.id}
            className="p-1 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
            title="Download"
          >
            {downloading === att.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          </button>
          <RoleGate allowed={['admin', 'manager']}>
            <button
              onClick={() => onDelete(att.id, att.storage_path)}
              className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </RoleGate>
        </div>
      ))}
    </div>
  );
}
