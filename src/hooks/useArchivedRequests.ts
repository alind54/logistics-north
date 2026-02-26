import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface ArchivedRequest {
  id: string;
  description: string;
  notes: string;
  stage: string;
  is_urgent: boolean;
  created_by: string;
  project_id: string;
  created_at: string;
  deleted_at: string;
  deleted_by: string;
  project_name: string;
  creator_name: string;
  archiver_name: string;
}

interface DbRow {
  id: string;
  stage_id: string;
  description: string;
  notes: string;
  is_urgent: boolean;
  created_by: string;
  project_id: string;
  created_at: string;
  deleted_at: string;
  deleted_by: string;
}

export function useArchivedRequests(projectId: string | null) {
  const { user } = useAuth();
  const [archivedRequests, setArchivedRequests] = useState<ArchivedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchived = useCallback(async () => {
    if (!projectId) {
      setArchivedRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name');
    const profileMap = new Map<string, string>();
    (profilesData ?? []).forEach((p: { id: string; full_name: string }) => profileMap.set(p.id, p.full_name));

    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('project_id', projectId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (!error && data) {
      setArchivedRequests(
        (data as DbRow[]).map(row => ({
          id: row.id,
          description: row.description,
          notes: row.notes,
          stage: row.stage_id,
          is_urgent: row.is_urgent,
          created_by: row.created_by,
          project_id: row.project_id,
          created_at: row.created_at,
          deleted_at: row.deleted_at,
          deleted_by: row.deleted_by,
          project_name: '',
          creator_name: profileMap.get(row.created_by) ?? 'Unknown',
          archiver_name: profileMap.get(row.deleted_by) ?? 'Unknown',
        }))
      );
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    if (user && projectId) fetchArchived();
  }, [user, projectId, fetchArchived]);

  const restoreRequest = async (id: string) => {
    const { error } = await supabase
      .from('requests')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);
    if (error) {
      alert('Failed to restore request.');
      return;
    }
    await fetchArchived();
  };

  return { archivedRequests, loading, fetchArchived, restoreRequest };
}
