'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, cn } from '@request-tracker/ui';
import type { RequestListItemDTO, Priority } from '@request-tracker/shared';
import { formatMrfNumber } from '@request-tracker/shared';

interface RequestCardProps {
  request: RequestListItemDTO;
  onMove: (requestId: string, toStageId: string) => void;
  availableStages: Array<{ id: string; name: string }>;
}

const priorityVariant: Record<Priority, 'low' | 'normal' | 'high' | 'urgent'> = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
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

export function RequestCard({
  request,
  onMove,
  availableStages,
}: RequestCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = async (toStageId: string) => {
    setIsMoving(true);
    setShowMoveMenu(false);
    try {
      await onMove(request.id, toStageId);
    } finally {
      setIsMoving(false);
    }
  };

  const overdue = isOverdue(request.dueDate);

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
        isMoving && 'opacity-50'
      )}
    >
      {/* Priority Badge */}
      <div className="mb-2 flex items-center justify-between">
        <Badge variant={priorityVariant[request.priority]} className="text-xs">
          {request.priority}
        </Badge>
        {request.flowType && (
          <span className="text-xs text-muted-foreground">
            {request.flowType}
          </span>
        )}
      </div>

      {/* MRF Number + Days in Stage */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold font-mono text-primary">
          {formatMrfNumber(request.mrfNumber)}
        </span>
        {request.currentStageEnteredAt && (
          <span className={cn(
            'text-xs font-medium',
            (() => {
              const days = Math.ceil((Date.now() - new Date(request.currentStageEnteredAt).getTime()) / (1000 * 60 * 60 * 24));
              if (days > 7) return 'text-destructive';
              if (days > 3) return 'text-yellow-600 dark:text-yellow-400';
              return 'text-muted-foreground';
            })()
          )}>
            {Math.ceil((Date.now() - new Date(request.currentStageEnteredAt).getTime()) / (1000 * 60 * 60 * 24))}d in stage
          </span>
        )}
      </div>

      {/* Description */}
      <Link
        href={`/requests/${request.id}`}
        className="mb-2 block text-sm font-medium hover:text-primary"
      >
        {request.description.length > 80
          ? `${request.description.substring(0, 80)}...`
          : request.description}
      </Link>

      {/* Tags */}
      {request.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {request.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded px-1.5 py-0.5 text-xs"
              style={{
                backgroundColor: tag.color ? `${tag.color}20` : undefined,
                color: tag.color ?? undefined,
              }}
            >
              {tag.name}
            </span>
          ))}
          {request.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{request.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {request.dueDate && (
            <span className={cn(overdue && 'font-medium text-destructive')}>
              Due {formatDate(request.dueDate)}
            </span>
          )}
        </div>
        {request.owner && (
          <span title={request.owner.email}>
            {request.owner.email.split('@')[0]}
          </span>
        )}
      </div>

      {/* Move Button (visible on hover or always on mobile) */}
      <div className="mt-2 flex justify-end">
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs opacity-0 transition-opacity group-hover:opacity-100 md:opacity-0"
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            disabled={isMoving || availableStages.length === 0}
          >
            Move
          </Button>

          {/* Move Menu (Mobile-friendly) */}
          {showMoveMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMoveMenu(false)}
              />
              <div className="absolute bottom-full right-0 z-20 mb-1 w-48 rounded-md border bg-popover p-1 shadow-md">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Move to...
                </p>
                {availableStages.map((stage) => (
                  <button
                    key={stage.id}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => handleMove(stage.id)}
                  >
                    {stage.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile: Always show move button */}
      <div className="mt-2 md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-full text-xs"
          onClick={() => setShowMoveMenu(!showMoveMenu)}
          disabled={isMoving || availableStages.length === 0}
        >
          Move to Stage
        </Button>
      </div>
    </div>
  );
}
