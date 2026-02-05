'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@request-tracker/ui';
import type { TagDTO } from '@request-tracker/shared';

interface TagsManagerProps {
  initialTags: TagDTO[];
}

export function TagsManager({ initialTags }: TagsManagerProps) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const refresh = async () => {
    const res = await fetch('/api/admin/tags');
    const data = await res.json();
    setTags(data.data.tags);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Failed to create tag');
      }
      setNewName('');
      setNewColor('#3B82F6');
      setShowCreate(false);
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tag');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (tag: TagDTO) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color ?? '#3B82F6');
    setError('');
  };

  const handleUpdate = async (tagId: string) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/tags/${tagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Failed to update tag');
      }
      setEditingId(null);
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tagId: string, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all requests.`)) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/tags/${tagId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Failed to delete tag');
      }
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete tag');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Tags</h2>
          <p className="text-sm text-muted-foreground">Manage tags for categorizing requests</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'Add Tag'}
        </Button>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {showCreate && (
        <div className="border-b px-6 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Name</label>
              <Input
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                placeholder="Tag name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <span className="text-xs text-muted-foreground">{newColor}</span>
              </div>
            </div>
            <Button size="sm" onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      <div className="p-6">
        {tags.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No tags created yet</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tags.map((tag) => (
              <div key={tag.id} className="rounded-lg border p-4">
                {editingId === tag.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border"
                      />
                      <span className="text-xs">{editColor}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(tag.id)} disabled={saving}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded-full"
                        style={{ backgroundColor: tag.color ?? '#6B7280' }}
                      />
                      <span className="font-medium">{tag.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => startEdit(tag)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(tag.id, tag.name)}
                        disabled={saving}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
