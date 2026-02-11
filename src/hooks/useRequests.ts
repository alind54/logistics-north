import { useState, useEffect, useCallback } from 'react';
import type { Request } from '../types';
import { STAGES } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface DbRequest {
  id: string;
  stage_id: string;
  description: string;
  notes: string;
  created_by: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DbRequest): Request {
  return {
    id: row.id,
    stage: row.stage_id,
    description: row.description,
    notes: row.notes,
    created_by: row.created_by,
    project_id: row.project_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function useRequests(projectId: string | null) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);

  const fetchRequests = useCallback(async () => {
    if (!projectId) return;
    const { data, error } = await supabase
      .from('requests')
      .select('*')
      .eq('project_id', projectId)
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `project_id=eq.${projectId}` }, (payload) => {
        const updated = mapRow(payload.new as DbRequest);
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

  const addRequest = async (description: string, notes: string) => {
    if (!user || !projectId) return;
    const tempId = crypto.randomUUID();
    const optimistic: Request = {
      id: tempId,
      stage: STAGES[0].id,
      description,
      notes,
      created_by: user.id,
      project_id: projectId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRequests(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('requests')
      .insert({ stage_id: STAGES[0].id, description, notes, created_by: user.id, project_id: projectId })
      .select()
      .single();

    if (error) {
      setRequests(prev => prev.filter(r => r.id !== tempId));
      alert('Failed to create request. Please try again.');
    } else if (data) {
      setRequests(prev => prev.map(r => r.id === tempId ? mapRow(data as DbRequest) : r));
    }
  };

  const updateRequest = async (id: string, description: string, notes: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, description, notes } : r));
    const { error } = await supabase
      .from('requests')
      .update({ description, notes })
      .eq('id', id);
    if (error) {
      fetchRequests();
      alert('Failed to update request. Please try again.');
    }
  };

  const deleteRequest = async (id: string) => {
    const backup = requests.find(r => r.id === id);
    setRequests(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase.from('requests').delete().eq('id', id);
    if (error) {
      if (backup) setRequests(prev => [...prev, backup]);
      alert('Failed to delete request. Please try again.');
    }
  };

  const moveRequest = async (id: string, direction: 'forward' | 'backward') => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    const currentIndex = STAGES.findIndex(s => s.id === request.stage);
    const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= STAGES.length) return;
    const newStageId = STAGES[newIndex].id;

    setRequests(prev => prev.map(r => r.id === id ? { ...r, stage: newStageId } : r));
    const { error } = await supabase
      .from('requests')
      .update({ stage_id: newStageId })
      .eq('id', id);
    if (error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, stage: request.stage } : r));
      alert('Failed to move request. Please try again.');
    }
  };

  const clearDoneRequests = async (): Promise<number> => {
    if (!projectId) return 0;
    const doneItems = requests.filter(r => r.stage === 'done');
    const doneCount = doneItems.length;
    if (doneCount === 0) return 0;

    setRequests(prev => prev.filter(r => r.stage !== 'done'));
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('stage_id', 'done')
      .eq('project_id', projectId);
    if (error) {
      fetchRequests();
      alert('Failed to clear done items. Please try again.');
    }
    return doneCount;
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
    clearDoneRequests,
    getRequestsByStage,
  };
}
