import { useState, useEffect, useCallback } from 'react';
import type { Todo } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface DbTodo {
  id: string;
  user_id: string;
  task: string;
  notes: string;
  completed: boolean;
  project_id: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DbTodo): Todo {
  return {
    id: row.id,
    user_id: row.user_id,
    task: row.task,
    notes: row.notes,
    completed: row.completed,
    project_id: row.project_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function useTodos(projectId: string | null) {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);

  const fetchTodos = useCallback(async () => {
    if (!projectId) return;
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setTodos((data as DbTodo[]).map(mapRow));
    }
  }, [projectId]);

  useEffect(() => {
    if (!user || !projectId) {
      setTodos([]);
      return;
    }
    fetchTodos();

    const channel = supabase
      .channel(`todos-realtime-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'todos', filter: `project_id=eq.${projectId}` }, (payload) => {
        const newTodo = mapRow(payload.new as DbTodo);
        setTodos(prev => {
          if (prev.some(t => t.id === newTodo.id)) return prev;
          return [...prev, newTodo];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'todos', filter: `project_id=eq.${projectId}` }, (payload) => {
        const updated = mapRow(payload.new as DbTodo);
        setTodos(prev => prev.map(t => t.id === updated.id ? updated : t));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'todos', filter: `project_id=eq.${projectId}` }, (payload) => {
        const oldId = (payload.old as { id: string }).id;
        setTodos(prev => prev.filter(t => t.id !== oldId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, projectId, fetchTodos]);

  const addTodo = async (task: string, notes: string) => {
    if (!user || !projectId) return;
    const tempId = crypto.randomUUID();
    const optimistic: Todo = {
      id: tempId,
      user_id: user.id,
      task,
      notes,
      completed: false,
      project_id: projectId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTodos(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('todos')
      .insert({ user_id: user.id, task, notes, project_id: projectId })
      .select()
      .single();

    if (error) {
      setTodos(prev => prev.filter(t => t.id !== tempId));
      alert('Failed to create todo. Please try again.');
    } else if (data) {
      setTodos(prev => prev.map(t => t.id === tempId ? mapRow(data as DbTodo) : t));
    }
  };

  const updateTodo = async (id: string, task: string, notes: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, task, notes } : t));
    const { error } = await supabase
      .from('todos')
      .update({ task, notes })
      .eq('id', id);
    if (error) {
      fetchTodos();
      alert('Failed to update todo. Please try again.');
    }
  };

  const deleteTodo = async (id: string) => {
    const backup = todos.find(t => t.id === id);
    setTodos(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      if (backup) setTodos(prev => [...prev, backup]);
      alert('Failed to delete todo. Please try again.');
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const newCompleted = !todo.completed;
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted } : t));
    const { error } = await supabase
      .from('todos')
      .update({ completed: newCompleted })
      .eq('id', id);
    if (error) {
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: todo.completed } : t));
      alert('Failed to update todo. Please try again.');
    }
  };

  const clearCompleted = async (): Promise<number> => {
    if (!projectId) return 0;
    const completedItems = todos.filter(t => t.completed);
    const completedCount = completedItems.length;
    if (completedCount === 0) return 0;

    setTodos(prev => prev.filter(t => !t.completed));
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('completed', true)
      .eq('project_id', projectId);
    if (error) {
      fetchTodos();
      alert('Failed to clear completed. Please try again.');
    }
    return completedCount;
  };

  return {
    todos,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    clearCompleted,
  };
}
