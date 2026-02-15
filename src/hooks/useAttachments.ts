import { useState, useCallback } from 'react';
import type { Attachment } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

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

    const storagePath = `${projectId}/${reqId}/${crypto.randomUUID()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('request-attachments')
      .upload(storagePath, file);
    if (uploadError) {
      alert('Failed to upload file. Please try again.');
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
      alert('Failed to save attachment record. Please try again.');
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
