'use client';

import { useState } from 'react';
import { Button, Input, Textarea, cn } from '@request-tracker/ui';

interface Todo {
  id: string;
  task: string;
  notes: string | null;
  completed: boolean;
  createdAt: string;
}

interface TodoListProps {
  initialTodos: Todo[];
}

export function TodoList({ initialTodos }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [task, setTask] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completedCount = todos.filter((t) => t.completed).length;

  const resetForm = () => {
    setTask('');
    setNotes('');
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleCreate = async () => {
    if (!task.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim(), notes: notes.trim() || null }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setTodos((prev) => [data, ...prev]);
        resetForm();
      } else {
        const body = await res.json();
        setError(body.message || 'Failed to create todo');
      }
    } catch {
      setError('Failed to create todo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!task.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim(), notes: notes.trim() || null }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setTodos((prev) => prev.map((t) => (t.id === id ? data : t)));
        resetForm();
      } else {
        const body = await res.json();
        setError(body.message || 'Failed to update todo');
      }
    } catch {
      setError('Failed to update todo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed } : t))
    );

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      if (!res.ok) {
        // Revert
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
        );
      }
    } catch {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this to-do? This cannot be undone.')) return;

    const prev = todos;
    setTodos((t) => t.filter((todo) => todo.id !== id));

    try {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setTodos(prev);
      }
    } catch {
      setTodos(prev);
    }
  };

  const handleClearCompleted = async () => {
    if (!confirm(`Clear ${completedCount} completed to-do(s)?`)) return;

    const prev = todos;
    setTodos((t) => t.filter((todo) => !todo.completed));

    try {
      const res = await fetch('/api/todos/clear-completed', { method: 'POST' });
      if (!res.ok) {
        setTodos(prev);
      }
    } catch {
      setTodos(prev);
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setTask(todo.task);
    setNotes(todo.notes || '');
    setShowForm(false);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">To-Do List</h1>
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCompleted}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              Clear Completed ({completedCount})
            </Button>
          )}
          {!showForm && !editingId && (
            <Button
              size="sm"
              onClick={() => {
                setShowForm(true);
                setTask('');
                setNotes('');
                setError(null);
              }}
            >
              New To-Do
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="mb-4 rounded-lg border bg-card p-4">
          <Input
            placeholder="What needs to be done?"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCreate();
              }
            }}
            autoFocus
          />
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2"
            rows={2}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!task.trim() || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Todo Items */}
      {todos.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-sm">No to-dos yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={cn(
                'group rounded-lg border bg-card px-4 py-3 transition-colors',
                todo.completed && 'opacity-60'
              )}
            >
              {editingId === todo.id ? (
                /* Edit Mode */
                <div>
                  <Input
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleUpdate(todo.id);
                      }
                      if (e.key === 'Escape') resetForm();
                    }}
                    autoFocus
                  />
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="mt-2"
                    rows={2}
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(todo.id)}
                      disabled={!task.trim() || isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    type="button"
                    className={cn(
                      'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      todo.completed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-muted-foreground/40 hover:border-emerald-500'
                    )}
                    onClick={() => handleToggle(todo.id, !todo.completed)}
                    aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {todo.completed && (
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        todo.completed && 'line-through text-muted-foreground'
                      )}
                    >
                      {todo.task}
                    </p>
                    {todo.notes && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {todo.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() => startEdit(todo)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-0.5 text-[11px] text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(todo.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
