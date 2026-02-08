'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@request-tracker/ui';
import type { RequestListItemDTO, Priority } from '@request-tracker/shared';
import { formatMrfNumber } from '@request-tracker/shared';

interface RequestCardProps {
  request: RequestListItemDTO;
  onMove: (requestId: string, toStageId: string) => void;
  onDelete?: (requestId: string) => void;
  availableStages: Array<{ id: string; name: string }>;
  canDelete?: boolean;
  isDragOverlay?: boolean;
}

const priorityColors: Record<Priority, string> = {
  LOW: 'bg-slate-400',
  NORMAL: 'bg-blue-400',
  HIGH: 'bg-orange-400',
  URGENT: 'bg-red-400',
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function isOverdue(dateString: string | null): boolean {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
}

function getDaysInStage(enteredAt: string | null): number {
  if (!enteredAt) return 0;
  return Math.ceil((Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60 * 24));
}

export function RequestCard({
  request,
  onMove,
  onDelete,
  availableStages,
  canDelete = false,
  isDragOverlay = false,
}: RequestCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: request.id,
    data: { request },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const handleMove = async (toStageId: string) => {
    setIsMoving(true);
    setShowMoveMenu(false);
    try {
      await onMove(request.id, toStageId);
    } finally {
      setIsMoving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (confirm(`Delete "${request.description.substring(0, 50)}"? This cannot be undone.`)) {
      onDelete(request.id);
    }
  };

  const overdue = isOverdue(request.dueDate);
  const daysInStage = getDaysInStage(request.currentStageEnteredAt);

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={style}
      {...(!isDragOverlay ? { ...attributes, ...listeners } : {})}
      className={cn(
        'group relative rounded-lg border bg-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30',
        isDragOverlay && 'shadow-lg ring-2 ring-primary/30',
        isMoving && 'opacity-50'
      )}
    >
      {/* Row 1: MRF + Priority dot */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold font-mono text-primary">
          {formatMrfNumber(request.mrfNumber)}
        </span>
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', priorityColors[request.priority])} title={request.priority} />
        </div>
      </div>

      {/* Row 2: Description */}
      <Link
        href={`/requests/${request.id}`}
        className="mb-1.5 block text-sm font-medium leading-snug hover:text-primary"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
        title={request.description}
      >
        {request.description.length > 60
          ? `${request.description.substring(0, 60)}...`
          : request.description}
      </Link>

      {/* Row 3: Due date + Days in stage + Owner */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {request.dueDate && (
            <span className={cn(overdue && 'font-medium text-destructive')}>
              {overdue ? 'Overdue' : `Due ${formatDate(request.dueDate)}`}
            </span>
          )}
          {daysInStage > 0 && (
            <span className={cn(
              'font-medium',
              daysInStage > 7 ? 'text-destructive' :
              daysInStage > 3 ? 'text-yellow-400' :
              'text-muted-foreground'
            )}>
              {daysInStage}d
            </span>
          )}
        </div>
        {request.owner && (
          <span title={request.owner.email}>
            {request.owner.email.split('@')[0]}
          </span>
        )}
      </div>

      {/* Action buttons - visible on hover */}
      <div className="mt-1.5 flex justify-end gap-1">
        {canDelete && onDelete && (
          <button
            type="button"
            className="rounded border border-destructive/30 px-2 py-0.5 text-[11px] text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            Delete
          </button>
        )}
        <div className="relative">
          <button
            type="button"
            className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveMenu(!showMoveMenu);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={isMoving || availableStages.length === 0}
          >
            Move
          </button>

          {showMoveMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMoveMenu(false)}
              />
              <div className="absolute top-full right-0 z-20 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Move to...
                </p>
                {availableStages.map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => handleMove(stage.id)}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {stage.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
