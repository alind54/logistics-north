import { useState, useEffect, useCallback } from 'react';
import type { AuditLog } from '../types';
import { supabase } from '../lib/supabase';

interface TodoStats {
  total: number;
  completed: number;
}

interface DashboardData {
  stageData: Record<string, number>;
  totalAttachments: number;
  todoStats: TodoStats;
  recentLogs: AuditLog[];
  loading: boolean;
}

export function useDashboardData(projectId: string | null): DashboardData {
  const [stageData, setStageData] = useState<Record<string, number>>({});
  const [totalAttachments, setTotalAttachments] = useState(0);
  const [todoStats, setTodoStats] = useState<TodoStats>({ total: 0, completed: 0 });
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!projectId) {
      setStageData({});
      setTotalAttachments(0);
      setTodoStats({ total: 0, completed: 0 });
      setRecentLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch requests grouped by stage
      const { data: requests } = await supabase
        .from('requests')
        .select('stage_id')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const stageCounts: Record<string, number> = {};
      if (requests) {
        for (const row of requests) {
          const stageId = row.stage_id as string;
          stageCounts[stageId] = (stageCounts[stageId] || 0) + 1;
        }
      }
      setStageData(stageCounts);

      // Fetch total attachment count
      const { count: attachmentCount } = await supabase
        .from('attachments')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);

      setTotalAttachments(attachmentCount ?? 0);

      // Fetch todo counts
      const { data: todos } = await supabase
        .from('todos')
        .select('completed')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (todos) {
        const total = todos.length;
        const completed = todos.filter((t) => t.completed).length;
        setTodoStats({ total, completed });
      } else {
        setTodoStats({ total: 0, completed: 0 });
      }

      // Fetch recent audit logs with user profiles
      const { data: logsData } = await supabase
        .from('audit_logs')
        .select('*, profiles!user_id(email, full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsData) {
        const mapped: AuditLog[] = logsData.map((row: Record<string, unknown>) => {
          const profile = row.profiles as { email?: string; full_name?: string } | null;
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
          };
        });
        setRecentLogs(mapped);
      } else {
        setRecentLogs([]);
      }
    } catch {
      // Silently handle errors - data will remain at defaults
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { stageData, totalAttachments, todoStats, recentLogs, loading };
}
