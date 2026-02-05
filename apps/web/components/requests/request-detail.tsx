'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
  cn,
} from '@request-tracker/ui';
import type {
  RequestDetailDTO,
  Priority,
  TransitionDTO,
} from '@request-tracker/shared';
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

interface TransitionWithStage extends TransitionDTO {
  toStage: { id: string; name: string; orderIndex: number } | null;
}

interface RequestDetailProps {
  request: RequestDetailDTO;
  availableTransitions: TransitionWithStage[];
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
  availableTransitions,
  auditEvents,
  canEdit,
  canUpload,
  canDeleteAttachment,
  canViewAudit,
}: RequestDetailProps) {
  const router = useRouter();
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

  const handleSave = async () => {
    setIsSaving(true);
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
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveStage = async () => {
    if (!selectedStageId) return;
    setIsMoving(true);

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
      }
    } finally {
      setIsMoving(false);
    }
  };

  // Find current stage history entry (one without exitedAt)
  const currentStageHistory = request.stageHistory.find((h) => !h.exitedAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/requests"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to Requests
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Request Details</h1>
        </div>
        {canEdit && !isEditing && (
          <Button onClick={() => setIsEditing(true)}>Edit Request</Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Request Info */}
          <Card>
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
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
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Description
                    </h3>
                    <p className="mt-1">{request.description}</p>
                  </div>
                  {request.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Notes
                      </h3>
                      <p className="mt-1 whitespace-pre-wrap">{request.notes}</p>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Priority
                      </h3>
                      <Badge
                        variant={priorityVariant[request.priority]}
                        className="mt-1"
                      >
                        {request.priority}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Flow Type
                      </h3>
                      <p className="mt-1">{request.flowType}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Due Date
                      </h3>
                      <p className="mt-1">{formatDate(request.dueDate)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Owner
                      </h3>
                      <p className="mt-1">{request.owner?.email ?? '-'}</p>
                    </div>
                  </div>
                  {request.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Tags
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {request.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded px-2 py-1 text-sm"
                            style={{
                              backgroundColor: tag.color
                                ? `${tag.color}20`
                                : undefined,
                              color: tag.color ?? undefined,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Stage Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Stage Timeline</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Audit Log */}
          {canViewAudit && (
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditEventList events={auditEvents} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Stage */}
          <Card>
            <CardHeader>
              <CardTitle>Current Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-medium">
                    {request.currentStage.name}
                  </p>
                  {currentStageHistory && (
                    <p className="text-sm text-muted-foreground">
                      Time in stage:{' '}
                      {getCurrentDuration(currentStageHistory.enteredAt)}
                    </p>
                  )}
                </div>

                {canEdit && availableTransitions.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-medium text-sm">Move to Stage</h4>
                    <Select
                      value={selectedStageId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStageId(e.target.value)}
                    >
                      <option value="">Select stage...</option>
                      {availableTransitions.map((t) => (
                        <option key={t.toStage!.id} value={t.toStage!.id}>
                          {t.toStage!.name}
                        </option>
                      ))}
                    </Select>
                    <Input
                      placeholder="Reason (optional)"
                      value={moveReason}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMoveReason(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      onClick={handleMoveStage}
                      disabled={!selectedStageId || isMoving}
                    >
                      {isMoving ? 'Moving...' : 'Move Stage'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDateTime(request.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{formatDateTime(request.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created By</span>
                <span>{request.createdBy.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attachments</span>
                <span>{request.attachments.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Attachments ({request.attachments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AttachmentList
                attachments={request.attachments}
                canDelete={canDeleteAttachment}
              />
              {canUpload && (
                <AttachmentUploader requestId={request.id} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
