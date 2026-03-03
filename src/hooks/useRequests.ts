import { useState, useEffect, useCallback } from 'react';
import type { Request, StageHistoryEntry } from '../types';
import { STAGES, STAGE_TRANSITIONS } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { showToast } from '../lib/toast';

interface DbRequest {
  id: string;
  stage_id: string;
  description: string;
  notes: string;
  is_urgent: boolean;
  created_by: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  request_stage_history?: { stage_id: string; entered_at: string }[];
}

function mapRow(row: DbRequest): Request {
  return {
    id: row.id,
    stage: row.stage_id,
    description: row.description,
    notes: row.notes,
    is_urgent: row.is_urgent ?? false,
    created_by: row.created_by,
    project_id: row.project_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    stage_history: (row.request_stage_history ?? [])
      .slice()
      .sort((a, b) => new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime()),
  };
}

export function useRequests(projectId: string | null) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);

  const fetchRequests = useCallback(async () => {
    if (!projectId) return;
    const { data, error } = await supabase
      .from('requests')
      .select('*, request_stage_history(stage_id, entered_at)')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setRequests((data as DbRequest[]).map(mapRow));
    }
  }, [projectId]);

  useEffect(() => {
    if (!user || !projectId) {
      setRequests([]);
      return;
    }
    fetchRequests();

    const channel = supabase
      .channel(`requests-realtime-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: `project_id=eq.${projectId}` }, (payload) => {
        const newReq = mapRow(payload.new as DbRequest);
        setRequests(prev => {
          if (prev.some(r => r.id === newReq.id)) return prev;
          return [...prev, newReq];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `project_id=eq.${projectId}` }, async (payload) => {
        const newRow = payload.new as DbRequest & { deleted_at?: string | null };
        if (newRow.deleted_at) {
          setRequests(prev => prev.filter(r => r.id !== newRow.id));
          return;
        }
        const { data: historyData } = await supabase
          .from('request_stage_history')
          .select('stage_id, entered_at')
          .eq('request_id', newRow.id)
          .order('entered_at', { ascending: true });
        const updated = mapRow({ ...newRow, request_stage_history: historyData ?? [] });
        setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'requests', filter: `project_id=eq.${projectId}` }, (payload) => {
        const oldId = (payload.old as { id: string }).id;
        setRequests(prev => prev.filter(r => r.id !== oldId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, projectId, fetchRequests]);

  const moveRequestToStage = async (id: string, targetStageId: string) => {
    const request = requests.find(r => r.id === id);
    if (!request || request.stage === targetStageId) return;
    if (!STAGES.some(s => s.id === targetStageId)) return;

    const now = new Date().toISOString();
    const newEntry: StageHistoryEntry = { stage_id: targetStageId, entered_at: now };
    setRequests(prev => prev.map(r => r.id === id
      ? { ...r, stage: targetStageId, stage_history: [...(r.stage_history ?? []), newEntry] }
      : r
    ));
    const { error } = await supabase
      .from('requests')
      .update({ stage_id: targetStageId })
      .eq('id', id);
    if (error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, stage: request.stage, stage_history: request.stage_history } : r));
      showToast('error', 'Failed to move request. Please try again.');
    } else {
      await supabase.from('request_stage_history').insert({ request_id: id, stage_id: targetStageId, entered_at: now });
    }
  };

  const addRequest = async (description: string, notes: string, isUrgent: boolean = false): Promise<string | undefined> => {
    if (!user || !projectId) return;
    const tempId = crypto.randomUUID();
    const optimistic: Request = {
      id: tempId,
      stage: STAGES[0].id,
      description,
      notes,
      is_urgent: isUrgent,
      created_by: user.id,
      project_id: projectId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRequests(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('requests')
      .insert({ stage_id: STAGES[0].id, description, notes, is_urgent: isUrgent, created_by: user.id, project_id: projectId })
      .select()
      .single();

    if (error) {
      setRequests(prev => prev.filter(r => r.id !== tempId));
      showToast('error', 'Failed to create request. Please try again.');
      return undefined;
    } else if (data) {
      const initialHistory: StageHistoryEntry[] = [{ stage_id: STAGES[0].id, entered_at: data.created_at }];
      const mapped = { ...mapRow(data as DbRequest), stage_history: initialHistory };
      setRequests(prev => prev.map(r => r.id === tempId ? mapped : r));
      await supabase.from('request_stage_history').insert({ request_id: data.id, stage_id: STAGES[0].id, entered_at: data.created_at });
      return mapped.id;
    }
  };

  const updateRequest = async (id: string, description: string, notes: string, isUrgent?: boolean) => {
    const updates: Partial<Request> = { description, notes };
    if (isUrgent !== undefined) updates.is_urgent = isUrgent;
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

    const dbUpdates: Record<string, unknown> = { description, notes };
    if (isUrgent !== undefined) dbUpdates.is_urgent = isUrgent;
    const { error } = await supabase
      .from('requests')
      .update(dbUpdates)
      .eq('id', id);
    if (error) {
      fetchRequests();
      showToast('error', 'Failed to update request. Please try again.');
    }
  };

  const deleteRequest = async (id: string) => {
    const backup = requests.find(r => r.id === id);
    setRequests(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase.from('requests').delete().eq('id', id);
    if (error) {
      if (backup) setRequests(prev => [...prev, backup]);
      showToast('error', 'Failed to delete request. Please try again.');
    }
  };

  const moveRequest = async (id: string, direction: 'forward' | 'backward') => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    const transitions = STAGE_TRANSITIONS[request.stage];
    if (!transitions) return;

    let newStageId: string | null = null;
    if (direction === 'forward') {
      if (transitions.next.length === 1) newStageId = transitions.next[0];
      // If multiple next stages (branch point), do nothing — user must drag
    } else {
      newStageId = transitions.prev;
    }
    if (!newStageId) return;

    const now = new Date().toISOString();
    const newEntry: StageHistoryEntry = { stage_id: newStageId, entered_at: now };
    setRequests(prev => prev.map(r => r.id === id
      ? { ...r, stage: newStageId!, stage_history: [...(r.stage_history ?? []), newEntry] }
      : r
    ));
    const { error } = await supabase
      .from('requests')
      .update({ stage_id: newStageId })
      .eq('id', id);
    if (error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, stage: request.stage, stage_history: request.stage_history } : r));
      showToast('error', 'Failed to move request. Please try again.');
    } else {
      await supabase.from('request_stage_history').insert({ request_id: id, stage_id: newStageId, entered_at: now });
    }
  };

  const archiveRequest = async (id: string) => {
    if (!user) return;
    const backup = requests.find(r => r.id === id);
    if (!backup) return;

    setRequests(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase
      .from('requests')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq('id', id);
    if (error) {
      if (backup) setRequests(prev => [...prev, backup]);
      showToast('error', 'Failed to archive request. Please try again.');
    }
  };

  const getRequestsByStage = (stageId: string): Request[] => {
    return requests.filter(r => r.stage === stageId);
  };

  return {
    requests,
    addRequest,
    updateRequest,
    deleteRequest,
    moveRequest,
    moveRequestToStage,
    archiveRequest,
    getRequestsByStage,
  };
}
