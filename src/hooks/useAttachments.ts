import { useState, useCallback } from 'react';
import type { Attachment } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { showToast } from '../lib/toast';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'application/zip',
];
const ALLOWED_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.zip',
];

export function useAttachments(requestId: string | null) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!requestId) { setAttachments([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('attachments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (data) setAttachments(data as Attachment[]);
    setLoading(false);
  }, [requestId]);

  const uploadFile = async (reqId: string, projectId: string, file: File): Promise<boolean> => {
    if (!user) return false;

    if (file.size > MAX_FILE_SIZE) {
      showToast('error', 'File too large. Maximum size is 10MB.');
      return false;
    }

    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
    const mimeAllowed = ALLOWED_MIME_TYPES.includes(file.type);
    const extAllowed = ALLOWED_EXTENSIONS.includes(ext);
    if (!mimeAllowed && !extAllowed) {
      showToast('error', 'File type not allowed. Accepted: PDF, images, Office documents, text, CSV, ZIP.');
      return false;
    }

    const storagePath = `${projectId}/${reqId}/${crypto.randomUUID()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('request-attachments')
      .upload(storagePath, file);
    if (uploadError) {
      showToast('error', 'Failed to upload file. Please try again.');
      return false;
    }

    const { error: dbError } = await supabase.from('attachments').insert({
      request_id: reqId,
      project_id: projectId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      storage_path: storagePath,
      uploaded_by: user.id,
    });
    if (dbError) {
      await supabase.storage.from('request-attachments').remove([storagePath]);
      showToast('error', 'Failed to save attachment record. Please try again.');
      return false;
    }

    await fetchAttachments();
    return true;
  };

  const deleteFile = async (attachmentId: string, storagePath: string) => {
    await supabase.storage.from('request-attachments').remove([storagePath]);
    await supabase.from('attachments').delete().eq('id', attachmentId);
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const getDownloadUrl = async (storagePath: string): Promise<string | null> => {
    const { data } = await supabase.storage
      .from('request-attachments')
      .createSignedUrl(storagePath, 3600);
    return data?.signedUrl ?? null;
  };

  return { attachments, loading, fetchAttachments, uploadFile, deleteFile, getDownloadUrl };
}
