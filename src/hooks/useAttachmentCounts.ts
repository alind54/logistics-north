import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAttachmentCounts(projectId: string | null) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchCounts = useCallback(async () => {
    if (!projectId) { setCounts({}); return; }
    const { data } = await supabase
      .from('attachments')
      .select('request_id')
      .eq('project_id', projectId);
    if (data) {
      const map: Record<string, number> = {};
      for (const row of data) {
        map[row.request_id] = (map[row.request_id] || 0) + 1;
      }
      setCounts(map);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, refreshCounts: fetchCounts };
}
