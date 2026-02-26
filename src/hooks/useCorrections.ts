import { useState, useEffect, useCallback } from 'react';
import type { Request, Todo, Project } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { showToast } from '../lib/toast';

interface DbRequest {
  id: string;
  stage_id: string;
  description: string;
  notes: string;
  created_by: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

interface DbTodo {
  id: string;
  user_id: string;
  task: string;
  notes: string;
  completed: boolean;
  project_id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface CorrectionRequest extends Request {
  project_name?: string;
}

export interface CorrectionTodo extends Todo {
  project_name?: string;
}

function mapRequestRow(row: DbRequest): CorrectionRequest {
  return {
    id: row.id,
    stage: row.stage_id,
    description: row.description,
    notes: row.notes,
    created_by: row.created_by,
    project_id: row.project_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
  };
}

function mapTodoRow(row: DbTodo): CorrectionTodo {
  return {
    id: row.id,
    user_id: row.user_id,
    task: row.task,
    notes: row.notes,
    completed: row.completed,
    project_id: row.project_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
  };
}

export function useCorrections() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [todos, setTodos] = useState<CorrectionTodo[]>([]);
  const [deletedRequests, setDeletedRequests] = useState<CorrectionRequest[]>([]);
  const [deletedTodos, setDeletedTodos] = useState<CorrectionTodo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    // Fetch all projects for name lookup and dropdown
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .order('name');
    const projectsList: Project[] = projectsData ?? [];
    setProjects(projectsList);

    const projectMap = new Map<string, string>();
    projectsList.forEach(p => projectMap.set(p.id, p.name));

    // Fetch active requests (deleted_at IS NULL)
    const { data: activeReqs } = await supabase
      .from('requests')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (activeReqs) {
      setRequests(
        (activeReqs as DbRequest[]).map(row => ({
          ...mapRequestRow(row),
          project_name: projectMap.get(row.project_id) ?? 'Unknown',
        }))
      );
    }

    // Fetch deleted requests (deleted_at IS NOT NULL)
    const { data: delReqs } = await supabase
      .from('requests')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (delReqs) {
      setDeletedRequests(
        (delReqs as DbRequest[]).map(row => ({
          ...mapRequestRow(row),
          project_name: projectMap.get(row.project_id) ?? 'Unknown',
        }))
      );
    }

    // Fetch active todos (deleted_at IS NULL)
    const { data: activeTodos } = await supabase
      .from('todos')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (activeTodos) {
      setTodos(
        (activeTodos as DbTodo[]).map(row => ({
          ...mapTodoRow(row),
          project_name: projectMap.get(row.project_id) ?? 'Unknown',
        }))
      );
    }

    // Fetch deleted todos (deleted_at IS NOT NULL)
    const { data: delTodos } = await supabase
      .from('todos')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (delTodos) {
      setDeletedTodos(
        (delTodos as DbTodo[]).map(row => ({
          ...mapTodoRow(row),
          project_name: projectMap.get(row.project_id) ?? 'Unknown',
        }))
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  const insertAuditLog = async (
    action: string,
    entityType: string,
    entityId: string,
    projectId: string | null,
    changes: Record<string, unknown>,
    metadata: Record<string, unknown>
  ) => {
    if (!user) return;
    await supabase.from('audit_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      project_id: projectId,
      user_id: user.id,
      changes,
      metadata,
    });
  };

  const moveRequestStage = async (id: string, targetStageId: string, reason: string) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    const { error } = await supabase
      .from('requests')
      .update({ stage_id: targetStageId })
      .eq('id', id);

    if (error) {
      showToast('error', 'Failed to move request stage.');
      return;
    }

    await insertAuditLog('correction', 'request', id, request.project_id, {
      stage_id: { old: request.stage, new: targetStageId },
    }, { reason });

    await fetchAll();
  };

  const editRequest = async (
    id: string,
    updates: { description?: string; notes?: string; stage_id?: string; project_id?: string },
    reason: string
  ) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;

    const dbUpdates: Record<string, unknown> = {};
    const changes: Record<string, unknown> = {};

    if (updates.description !== undefined && updates.description !== request.description) {
      dbUpdates.description = updates.description;
      changes.description = { old: request.description, new: updates.description };
    }
    if (updates.notes !== undefined && updates.notes !== request.notes) {
      dbUpdates.notes = updates.notes;
      changes.notes = { old: request.notes, new: updates.notes };
    }
    if (updates.stage_id !== undefined && updates.stage_id !== request.stage) {
      dbUpdates.stage_id = updates.stage_id;
      changes.stage_id = { old: request.stage, new: updates.stage_id };
    }
    if (updates.project_id !== undefined && updates.project_id !== request.project_id) {
      dbUpdates.project_id = updates.project_id;
      changes.project_id = { old: request.project_id, new: updates.project_id };
    }

    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await supabase
      .from('requests')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      showToast('error', 'Failed to edit request.');
      return;
    }

    await insertAuditLog('correction', 'request', id, request.project_id, changes, { reason });
    await fetchAll();
  };

  const softDeleteRequest = async (id: string, reason: string) => {
    if (!user) return;
    const request = requests.find(r => r.id === id);
    if (!request) return;

    const { error } = await supabase
      .from('requests')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq('id', id);

    if (error) {
      showToast('error', 'Failed to delete request.');
      return;
    }

    await insertAuditLog('correction', 'request', id, request.project_id, {
      deleted_at: { old: null, new: new Date().toISOString() },
    }, { reason });

    await fetchAll();
  };

  const restoreRequest = async (id: string, reason: string) => {
    const request = deletedRequests.find(r => r.id === id);
    if (!request) return;

    const { error } = await supabase
      .from('requests')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);

    if (error) {
      showToast('error', 'Failed to restore request.');
      return;
    }

    await insertAuditLog('correction', 'request', id, request.project_id, {
      deleted_at: { old: request.deleted_at, new: null },
    }, { reason });

    await fetchAll();
  };

  const editTodo = async (
    id: string,
    updates: { task?: string; notes?: string; completed?: boolean },
    reason: string
  ) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const dbUpdates: Record<string, unknown> = {};
    const changes: Record<string, unknown> = {};

    if (updates.task !== undefined && updates.task !== todo.task) {
      dbUpdates.task = updates.task;
      changes.task = { old: todo.task, new: updates.task };
    }
    if (updates.notes !== undefined && updates.notes !== todo.notes) {
      dbUpdates.notes = updates.notes;
      changes.notes = { old: todo.notes, new: updates.notes };
    }
    if (updates.completed !== undefined && updates.completed !== todo.completed) {
      dbUpdates.completed = updates.completed;
      changes.completed = { old: todo.completed, new: updates.completed };
    }

    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await supabase
      .from('todos')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      showToast('error', 'Failed to edit todo.');
      return;
    }

    await insertAuditLog('correction', 'todo', id, todo.project_id, changes, { reason });
    await fetchAll();
  };

  const softDeleteTodo = async (id: string, reason: string) => {
    if (!user) return;
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const { error } = await supabase
      .from('todos')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq('id', id);

    if (error) {
      showToast('error', 'Failed to delete todo.');
      return;
    }

    await insertAuditLog('correction', 'todo', id, todo.project_id, {
      deleted_at: { old: null, new: new Date().toISOString() },
    }, { reason });

    await fetchAll();
  };

  const restoreTodo = async (id: string, reason: string) => {
    const todo = deletedTodos.find(t => t.id === id);
    if (!todo) return;

    const { error } = await supabase
      .from('todos')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);

    if (error) {
      showToast('error', 'Failed to restore todo.');
      return;
    }

    await insertAuditLog('correction', 'todo', id, todo.project_id, {
      deleted_at: { old: todo.deleted_at, new: null },
    }, { reason });

    await fetchAll();
  };

  const bulkMoveRequests = async (ids: string[], targetStageId: string, reason: string) => {
    const { error } = await supabase
      .from('requests')
      .update({ stage_id: targetStageId })
      .in('id', ids);

    if (error) {
      showToast('error', 'Failed to bulk move requests.');
      return;
    }

    for (const id of ids) {
      const request = requests.find(r => r.id === id);
      if (request) {
        await insertAuditLog('correction', 'request', id, request.project_id, {
          stage_id: { old: request.stage, new: targetStageId },
        }, { reason });
      }
    }

    await fetchAll();
  };

  const bulkDeleteRequests = async (ids: string[], reason: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('requests')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .in('id', ids);

    if (error) {
      showToast('error', 'Failed to bulk delete requests.');
      return;
    }

    for (const id of ids) {
      const request = requests.find(r => r.id === id);
      if (request) {
        await insertAuditLog('correction', 'request', id, request.project_id, {
          deleted_at: { old: null, new: new Date().toISOString() },
        }, { reason });
      }
    }

    await fetchAll();
  };

  return {
    requests,
    todos,
    deletedRequests,
    deletedTodos,
    projects,
    loading,
    fetchAll,
    moveRequestStage,
    editRequest,
    softDeleteRequest,
    restoreRequest,
    editTodo,
    softDeleteTodo,
    restoreTodo,
    bulkMoveRequests,
    bulkDeleteRequests,
  };
}
