'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Select } from '@request-tracker/ui';
import type { StageDTO, TransitionDTO } from '@request-tracker/shared';

interface TransitionWithStages extends TransitionDTO {
  fromStageName: string;
  toStageName: string;
}

interface TransitionsManagerProps {
  initialTransitions: TransitionWithStages[];
  stages: StageDTO[];
}

export function TransitionsManager({ initialTransitions, stages }: TransitionsManagerProps) {
  const router = useRouter();
  const [transitions, setTransitions] = useState(initialTransitions);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Create form state
  const [fromStageId, setFromStageId] = useState('');
  const [toStageId, setToStageId] = useState('');
  const [appliesTo, setAppliesTo] = useState('BOTH');

  const refresh = async () => {
    const res = await fetch('/api/admin/transitions');
    const data = await res.json();
    setTransitions(data.data.transitions);
  };

  const handleCreate = async () => {
    if (!fromStageId || !toStageId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromStageId, toStageId, appliesTo }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Failed to create transition');
      }
      setFromStageId('');
      setToStageId('');
      setShowCreate(false);
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create transition');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (transitionId: string, currentActive: boolean) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/transitions/${transitionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || 'Failed to update transition');
      }
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update transition');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Transitions</h2>
          <p className="text-sm text-muted-foreground">
            Define allowed stage-to-stage transitions
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'Add Transition'}
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
              <label className="text-xs font-medium">From Stage</label>
              <Select
                value={fromStageId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFromStageId(e.target.value)}
              >
                <option value="">Select...</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">To Stage</label>
              <Select
                value={toStageId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setToStageId(e.target.value)}
              >
                <option value="">Select...</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Applies To</label>
              <Select
                value={appliesTo}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAppliesTo(e.target.value)}
              >
                <option value="BOTH">Both</option>
                <option value="ORDER">Order</option>
                <option value="CONTRACT">Contract</option>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving || !fromStageId || !toStageId}
            >
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="pb-3 text-left text-sm font-medium">From Stage</th>
              <th className="pb-3 text-left text-sm font-medium"></th>
              <th className="pb-3 text-left text-sm font-medium">To Stage</th>
              <th className="pb-3 text-left text-sm font-medium">Applies To</th>
              <th className="pb-3 text-left text-sm font-medium">Status</th>
              <th className="pb-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transitions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No transitions configured
                </td>
              </tr>
            ) : (
              transitions.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{t.fromStageName}</td>
                  <td className="py-3 text-muted-foreground">→</td>
                  <td className="py-3 font-medium">{t.toStageName}</td>
                  <td className="py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        t.appliesTo === 'BOTH'
                          ? 'bg-blue-500/15 text-blue-400'
                          : t.appliesTo === 'ORDER'
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-purple-500/15 text-purple-400'
                      }`}
                    >
                      {t.appliesTo}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        t.isActive
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {t.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggle(t.id, t.isActive)}
                      disabled={saving}
                    >
                      {t.isActive ? 'Disable' : 'Enable'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
