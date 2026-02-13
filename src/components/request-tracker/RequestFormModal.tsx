import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Modal from '../Modal';
import FileUploadZone from './FileUploadZone';
import AttachmentList from './AttachmentList';
import { useAttachments } from '../../hooks/useAttachments';

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string, notes: string, stagedFiles?: File[]) => void;
  initialData?: { description: string; notes: string } | null;
  requestId?: string | null;
  projectId?: string | null;
}

export default function RequestFormModal({ isOpen, onClose, onSubmit, initialData, requestId, projectId }: RequestFormModalProps) {
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const { attachments, fetchAttachments, uploadFile, deleteFile, getDownloadUrl } = useAttachments(requestId ?? null);

  useEffect(() => {
    if (isOpen) {
      setDescription(initialData?.description ?? '');
      setNotes(initialData?.notes ?? '');
      setStagedFiles([]);
      if (requestId) fetchAttachments();
    }
  }, [isOpen, initialData, requestId, fetchAttachments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit(description.trim(), notes.trim(), requestId ? undefined : stagedFiles);
    onClose();
  };

  const handleUploadForExisting = async (file: File): Promise<boolean> => {
    if (!requestId || !projectId) return false;
    return uploadFile(requestId, projectId, file);
  };

  const handleStageFile = async (file: File): Promise<boolean> => {
    setStagedFiles(prev => [...prev, file]);
    return true;
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Request' : 'New Request'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="Enter item description..."
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
            rows={3}
            placeholder="Optional notes..."
          />
        </div>

        {projectId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
            {requestId ? (
              <>
                <AttachmentList attachments={attachments} onDelete={deleteFile} onDownload={getDownloadUrl} />
                <div className={attachments.length > 0 ? 'mt-2' : ''}>
                  <FileUploadZone onUpload={handleUploadForExisting} />
                </div>
              </>
            ) : (
              <>
                {stagedFiles.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {stagedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                        <span className="flex-1 truncate text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {file.size < 1024 ? `${file.size} B` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeStagedFile(index)}
                          className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <FileUploadZone onUpload={handleStageFile} />
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md"
          >
            {initialData ? 'Update Request' : 'Add Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
