'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select } from '@request-tracker/ui';
import type { StageDTO } from '@request-tracker/shared';

interface StagesManagerProps {
  initialStages: StageDTO[];
}

export function StagesManager({ initialStages }: StagesManagerProps) {
  const router = useRouter();
  const [stages, setStages] = useState(initialStages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Create form state
  const [newName, setNewName] = useState('');
  const [newAppliesTo, setNewAppliesTo] = useState('BOTH');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editAppliesTo, setEditAppliesTo] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Drag and drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const maxOrder = stages.reduce((max, s) => Math.max(max, s.orderIndex), -1);
      const res = await fetch('/api/admin/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          orderIndex: maxOrder + 1,
          appliesTo: newAppliesTo,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Failed to create stage');
      }
      setNewName('');
      setShowCreate(false);
      router.refresh();
      // Refetch stages
      const updated = await fetch('/api/admin/stages');
      const data = await updated.json();
      setStages(data.data.stages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create stage');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (stage: StageDTO) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditAppliesTo(stage.appliesTo);
    setEditActive(stage.isActive);
    setError('');
  };

  const handleUpdate = async (stageId: string) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/stages/${stageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          appliesTo: editAppliesTo,
          isActive: editActive,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Failed to update stage');
      }
      setEditingId(null);
      router.refresh();
      const updated = await fetch('/api/admin/stages');
      const data = await updated.json();
      setStages(data.data.stages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update stage');
    } finally {
      setSaving(false);
    }
  };

  const persistReorder = async (ids: string[]) => {
    setSaving(true);
    try {
      await fetch('/api/admin/stages/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageIds: ids }),
      });
      const updated = await fetch('/api/admin/stages');
      const data = await updated.json();
      setStages(data.data.stages);
      router.refresh();
    } catch {
      setError('Failed to reorder');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newStages = [...stages];
    const dragged = newStages[dragIndex]!;
    newStages.splice(dragIndex, 1);
    newStages.splice(dropIndex, 0, dragged);
    setStages(newStages);
    setDragIndex(null);
    setDragOverIndex(null);

    await persistReorder(newStages.map((s) => s.id));
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const ids = stages.map((s) => s.id);
    const temp = ids[index]!;
    ids[index] = ids[index - 1]!;
    ids[index - 1] = temp;
    await persistReorder(ids);
  };

  const handleMoveDown = async (index: number) => {
    if (index === stages.length - 1) return;
    const ids = stages.map((s) => s.id);
    const temp = ids[index]!;
    ids[index] = ids[index + 1]!;
    ids[index + 1] = temp;
    await persistReorder(ids);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Workflow Stages</h2>
          <p className="text-sm text-muted-foreground">
            Configure stages for Order and Contract workflows. Drag rows to reorder.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'Add Stage'}
        </Button>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="border-b px-6 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Name</label>
              <Input
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                placeholder="Stage name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Applies To</label>
              <Select
                value={newAppliesTo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewAppliesTo(e.target.value)}
              >
                <option value="BOTH">Both</option>
                <option value="ORDER">Order</option>
                <option value="CONTRACT">Contract</option>
              </Select>
            </div>
            <Button size="sm" onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {/* Stages table */}
      <div className="overflow-x-auto p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="pb-3 text-left text-sm font-medium">Order</th>
              <th className="pb-3 text-left text-sm font-medium">Name</th>
              <th className="pb-3 text-left text-sm font-medium">Applies To</th>
              <th className="pb-3 text-left text-sm font-medium">Status</th>
              <th className="pb-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, index) => (
              <tr
                key={stage.id}
                className={`border-b last:border-0 ${
                  dragOverIndex === index ? 'bg-accent/50' : ''
                } ${dragIndex === index ? 'opacity-50' : ''}`}
                draggable={editingId !== stage.id}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                {editingId === stage.id ? (
                  <>
                    <td className="py-3">{stage.orderIndex}</td>
                    <td className="py-3">
                      <Input
                        value={editName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                        className="max-w-[200px]"
                      />
                    </td>
                    <td className="py-3">
                      <Select
                        value={editAppliesTo}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditAppliesTo(e.target.value)}
                      >
                        <option value="BOTH">Both</option>
                        <option value="ORDER">Order</option>
                        <option value="CONTRACT">Contract</option>
                      </Select>
                    </td>
                    <td className="py-3">
                      <Select
                        value={editActive ? 'true' : 'false'}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setEditActive(e.target.value === 'true')
                        }
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </Select>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleUpdate(stage.id)} disabled={saving}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <span className="w-6 text-center text-sm">{stage.orderIndex}</span>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0 || saving}
                          title="Move up"
                        >
                          &#9650;
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === stages.length - 1 || saving}
                          title="Move down"
                        >
                          &#9660;
                        </button>
                      </div>
                    </td>
                    <td className="py-3 font-medium">{stage.name}</td>
                    <td className="py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          stage.appliesTo === 'BOTH'
                            ? 'bg-blue-100 text-blue-700'
                            : stage.appliesTo === 'ORDER'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {stage.appliesTo}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          stage.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {stage.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => startEdit(stage)}>
                        Edit
                      </Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
