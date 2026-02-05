'use client';

import { useState } from 'react';
import { Button, Input, Label, Select, Textarea } from '@request-tracker/ui';
import type { FlowType, Priority } from '@request-tracker/shared';

interface CreateRequestDialogProps {
  flowType: FlowType;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateRequestDialog({
  flowType,
  onClose,
  onCreated,
}: CreateRequestDialogProps) {
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          notes: notes || null,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          flowType,
        }),
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to create request');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create New Request</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-accent"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Enter request description..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value as Priority)}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Flow Type</Label>
            <p className="text-sm text-muted-foreground">
              {flowType === 'ORDER' ? 'Order Path' : 'Contract Path'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !description.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
