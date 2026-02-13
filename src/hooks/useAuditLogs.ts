import { useState, useEffect, useCallback } from 'react';
import type { AuditLog } from '../types';
import { supabase } from '../lib/supabase';

export interface AuditLogFilters {
  projectId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

const PAGE_SIZE = 25;

export function useAuditLogs(filters: AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('*, profiles!user_id(email, full_name), projects!project_id(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filters.projectId) query = query.eq('project_id', filters.projectId);
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.entityType) query = query.eq('entity_type', filters.entityType);
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

    const { data, count, error } = await query;
    if (!error && data) {
      const mapped: AuditLog[] = data.map((row: Record<string, unknown>) => {
        const profile = row.profiles as { email?: string; full_name?: string } | null;
        const project = row.projects as { name?: string } | null;
        return {
          id: row.id as string,
          action: row.action as string,
          entity_type: row.entity_type as string,
          entity_id: row.entity_id as string,
          project_id: row.project_id as string | null,
          user_id: row.user_id as string,
          changes: (row.changes ?? {}) as Record<string, unknown>,
          metadata: (row.metadata ?? {}) as Record<string, unknown>,
          created_at: row.created_at as string,
          user_email: profile?.email,
          user_name: profile?.full_name,
          project_name: project?.name,
        };
      });
      setLogs(mapped);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [filters.projectId, filters.userId, filters.action, filters.entityType, filters.dateFrom, filters.dateTo, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters.projectId, filters.userId, filters.action, filters.entityType, filters.dateFrom, filters.dateTo]);

  return { logs, loading, totalCount, page, setPage, pageSize: PAGE_SIZE, refresh: fetchLogs };
}
