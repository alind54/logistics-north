'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  Textarea,
  cn,
} from '@request-tracker/ui';
import type {
  RequestDetailDTO,
  Priority,
  StageDTO,
} from '@request-tracker/shared';
import { formatMrfNumber } from '@request-tracker/shared';
import { AttachmentUploader } from '@/components/attachments/attachment-uploader';
import { AttachmentList } from '@/components/attachments/attachment-list';
import { AuditEventList } from '@/components/audit/audit-event-list';

interface AuditEvent {
  id: string;
  eventType: string;
  payload: unknown;
  createdAt: string;
  actor: { id: string; email: string };
}

interface RequestDetailProps {
  request: RequestDetailDTO;
  allStages: StageDTO[];
  auditEvents: AuditEvent[];
  canEdit: boolean;
  canUpload: boolean;
  canDeleteAttachment: boolean;
  canViewAudit: boolean;
}

const priorityVariant: Record<Priority, 'low' | 'normal' | 'high' | 'urgent'> = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

type Tab = 'details' | 'timeline' | 'documents' | 'activity';

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null) return 'In progress';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(ms / (1000 * 60));
  return `${minutes}m`;
}

function getCurrentDuration(enteredAt: string): string {
  const ms = Date.now() - new Date(enteredAt).getTime();
  return formatDuration(ms);
}

export function RequestDetail({
  request,
  allStages,
  auditEvents,
  canEdit,
  canUpload,
  canDeleteAttachment,
  canViewAudit,
}: RequestDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState('');
  const [moveReason, setMoveReason] = useState('');

  // Edit form state
  const [description, setDescription] = useState(request.description);
  const [notes, setNotes] = useState(request.notes ?? '');
  const [priority, setPriority] = useState<Priority>(request.priority);
  const [dueDate, setDueDate] = useState(
    request.dueDate ? request.dueDate.split('T')[0] : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          notes: notes || null,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        const data = await res.json();
        setSaveError(data.message || 'Failed to save changes');
      }
    } catch {
      setSaveError('An error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveStage = async () => {
    if (!selectedStageId) return;
    setIsMoving(true);
    setMoveError(null);

    try {
      const res = await fetch(`/api/requests/${request.id}/move-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStageId: selectedStageId,
          reason: moveReason || undefined,
        }),
      });

      if (res.ok) {
        setSelectedStageId('');
        setMoveReason('');
        router.refresh();
      } else {
        const data = await res.json();
        setMoveError(data.message || 'Failed to move stage');
      }
    } catch {
      setMoveError('An error occurred. Please try again.');
    } finally {
      setIsMoving(false);
    }
  };

  // Find current stage history entry (one without exitedAt)
  const currentStageHistory = request.stageHistory.find((h) => !h.exitedAt);

  // Compute completed stage IDs
  const completedStageIds = new Set(
    request.stageHistory.filter((h) => h.exitedAt).map((h) => h.stageId)
  );

  // Group attachments by stage
  const attachmentsByStage = new Map<string, typeof request.attachments>();
  const generalAttachments: typeof request.attachments = [];
  for (const att of request.attachments) {
    if (att.stageId) {
      const list = attachmentsByStage.get(att.stageId) ?? [];
      list.push(att);
      attachmentsByStage.set(att.stageId, list);
    } else {
      generalAttachments.push(att);
    }
  }

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'details', label: 'Details', show: true },
    { id: 'timeline', label: 'Timeline', show: true },
    { id: 'documents', label: `Documents (${request.attachments.length})`, show: true },
    { id: 'activity', label: 'Activity', show: canViewAudit },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/requests"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Projects
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-primary">
                {formatMrfNumber(request.mrfNumber)}
              </h1>
              <Badge variant={priorityVariant[request.priority]}>
                {request.priority}
              </Badge>
              <span className="rounded bg-muted px-2 py-1 text-xs font-medium">
                {request.currentStage.name}
              </span>
              {currentStageHistory && (
                <span className="text-xs text-muted-foreground">
                  {getCurrentDuration(currentStageHistory.enteredAt)} in stage
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {request.description.length > 120
                ? `${request.description.substring(0, 120)}...`
                : request.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            {canEdit && allStages.length > 1 && (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedStageId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStageId(e.target.value)}
                  className="w-36 text-sm"
                >
                  <option value="">Move to...</option>
                  {allStages
                    .filter((s) => s.id !== request.currentStage.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
                {selectedStageId && (
                  <>
                    <Input
                      placeholder="Reason"
                      value={moveReason}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMoveReason(e.target.value)}
                      className="w-32 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleMoveStage}
                      disabled={isMoving}
                    >
                      {isMoving ? 'Moving...' : 'Move'}
                    </Button>
                  </>
                )}
              </div>
            )}
            {moveError && (
              <p className="text-sm text-destructive">{moveError}</p>
            )}
            {canEdit && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); setSaveError(null); }}>
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stage Progress Bar */}
      <div className="flex items-center gap-1">
        {allStages.map((stage) => {
          const isCompleted = completedStageIds.has(stage.id);
          const isCurrent = stage.id === request.currentStage.id;
          return (
            <div key={stage.id} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'h-1.5 w-full rounded-full',
                  isCompleted ? 'bg-green-500' :
                  isCurrent ? 'bg-primary' : 'bg-muted'
                )}
                title={`${stage.name}${isCurrent ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
              />
              <span className={cn(
                'text-[10px] leading-tight text-center',
                isCurrent ? 'font-semibold text-primary' :
                isCompleted ? 'text-green-600' : 'text-muted-foreground'
              )}>
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tab Bar */}
      <div className="border-b">
        <div className="flex gap-6">
          {tabs.filter((t) => t.show).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'border-b-2 pb-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {isEditing ? (
            <div className="space-y-4 rounded-lg border bg-card p-6">
              {saveError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {saveError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  rows={3}
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
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setIsEditing(false); setSaveError(null); }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p className="mt-1">{request.description}</p>
                </div>
                {request.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
                    <p className="mt-1 whitespace-pre-wrap">{request.notes}</p>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Priority</h3>
                    <Badge variant={priorityVariant[request.priority]} className="mt-1">
                      {request.priority}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Flow Type</h3>
                    <p className="mt-1">{request.flowType}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Due Date</h3>
                    <p className="mt-1">{formatDate(request.dueDate)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Owner</h3>
                    <p className="mt-1">{request.owner?.email ?? '-'}</p>
                  </div>
                </div>
                {request.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {request.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center rounded px-2 py-1 text-sm"
                          style={{
                            backgroundColor: tag.color ? `${tag.color}20` : undefined,
                            color: tag.color ?? undefined,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata row */}
              <div className="flex flex-wrap gap-6 border-t pt-4 text-sm text-muted-foreground">
                <span>Created {formatDateTime(request.createdAt)}</span>
                <span>Updated {formatDateTime(request.updatedAt)}</span>
                <span>By {request.createdBy.email}</span>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {request.stageHistory.map((history, index) => (
            <div
              key={history.id}
              className={cn(
                'relative pl-6',
                index !== request.stageHistory.length - 1 &&
                  'border-l-2 border-muted pb-4'
              )}
            >
              <div
                className={cn(
                  'absolute -left-2 h-4 w-4 rounded-full',
                  history.exitedAt ? 'bg-muted' : 'bg-primary'
                )}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{history.stageName}</span>
                  {!history.exitedAt && (
                    <Badge variant="default" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Entered: {formatDateTime(history.enteredAt)}
                </p>
                {history.exitedAt && (
                  <p className="text-sm text-muted-foreground">
                    Exited: {formatDateTime(history.exitedAt)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Duration:{' '}
                  {history.exitedAt
                    ? formatDuration(history.durationMs)
                    : getCurrentDuration(history.enteredAt)}
                </p>
                {history.moveReason && (
                  <p className="text-sm italic text-muted-foreground">
                    Reason: {history.moveReason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          {allStages.map((stage) => {
            const stageAtts = attachmentsByStage.get(stage.id) ?? [];
            const isCurrent = stage.id === request.currentStage.id;
            const isVisited = completedStageIds.has(stage.id) || isCurrent;
            if (!isVisited && stageAtts.length === 0) return null;
            return (
              <div key={stage.id} className="rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{stage.name}</span>
                    {isCurrent && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">Current</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {stageAtts.length} file{stageAtts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {stageAtts.length > 0 ? (
                    <AttachmentList
                      attachments={stageAtts}
                      canDelete={canDeleteAttachment}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">No files uploaded</p>
                  )}
                  {canUpload && isCurrent && (
                    <AttachmentUploader requestId={request.id} stageId={stage.id} />
                  )}
                </div>
              </div>
            );
          })}
          {generalAttachments.length > 0 && (
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
                <span className="text-sm font-medium">General</span>
                <span className="text-xs text-muted-foreground">
                  {generalAttachments.length} file{generalAttachments.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-3">
                <AttachmentList
                  attachments={generalAttachments}
                  canDelete={canDeleteAttachment}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && canViewAudit && (
        <AuditEventList events={auditEvents} />
      )}
    </div>
  );
}
