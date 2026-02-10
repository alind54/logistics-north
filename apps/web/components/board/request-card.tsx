'use client';

import { useState, memo } from 'react';
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

// Priority → left border stripe color
const priorityBorder: Record<Priority, string> = {
  LOW: 'border-l-slate-400',
  NORMAL: 'border-l-blue-400',
  HIGH: 'border-l-amber-400',
  URGENT: 'border-l-red-500',
};

const priorityLabel: Record<Priority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
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

export const RequestCard = memo(function RequestCard({
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
        'group relative rounded-md border-l-[3px] border bg-card px-2.5 py-2 transition-colors hover:bg-muted/50 cursor-grab active:cursor-grabbing',
        priorityBorder[request.priority],
        isDragging && 'opacity-30',
        isDragOverlay && 'ring-2 ring-primary/30 shadow-md',
        isMoving && 'opacity-50'
      )}
    >
      {/* Row 1: MRF + Priority label */}
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-xs font-semibold font-mono text-primary">
          {formatMrfNumber(request.mrfNumber)}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {priorityLabel[request.priority]}
        </span>
      </div>

      {/* Row 2: Description */}
      <Link
        href={`/requests/${request.id}`}
        className="mb-1 block text-sm font-medium leading-snug hover:text-primary"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
        title={request.description}
      >
        {request.description.length > 50
          ? `${request.description.substring(0, 50)}...`
          : request.description}
      </Link>

      {/* Row 3: Due date + Days in stage + Owner */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {request.dueDate && (
            <span className={cn(overdue && 'font-medium text-destructive')}>
              {overdue ? 'Overdue' : `Due ${formatDate(request.dueDate)}`}
            </span>
          )}
          {daysInStage > 0 && (
            <span className={cn(
              'font-medium',
              daysInStage > 7 ? 'text-destructive' :
              daysInStage > 3 ? 'text-amber-600' :
              'text-muted-foreground'
            )}>
              {daysInStage}d
            </span>
          )}
        </div>
        {request.owner && (
          <span className="truncate max-w-[60px]" title={request.owner.email}>
            {request.owner.email.split('@')[0]}
          </span>
        )}
      </div>

      {/* Action buttons - visible on hover */}
      <div className="mt-1 flex justify-end gap-1">
        {canDelete && onDelete && (
          <button
            type="button"
            className="rounded border border-destructive/30 px-2 py-0.5 text-[11px] text-destructive transition-opacity hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100"
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
            className="rounded border px-2 py-0.5 text-[11px] text-muted-foreground transition-opacity hover:bg-accent hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
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
              <div className="absolute top-full right-0 z-20 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
                <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
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
});
