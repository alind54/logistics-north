'use client';

import { useDroppable } from '@dnd-kit/core';
import { RequestCard } from './request-card';
import { cn } from '@request-tracker/ui';
import type { RequestListItemDTO } from '@request-tracker/shared';

interface BoardColumnProps {
  stage: {
    id: string;
    name: string;
    orderIndex: number;
  };
  requests: RequestListItemDTO[];
  totalCount?: number;
  onMoveRequest: (requestId: string, toStageId: string) => void;
  onDeleteRequest?: (requestId: string) => void;
  availableStages: Array<{ id: string; name: string }>;
  canDelete?: boolean;
  isLoading?: boolean;
}

export function BoardColumn({
  stage,
  requests,
  totalCount,
  onMoveRequest,
  onDeleteRequest,
  availableStages,
  canDelete = false,
  isLoading,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-w-[280px] max-w-[320px] flex-1 flex-shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors',
        isOver && 'border-primary/40 bg-primary/5'
      )}
      role="region"
      aria-label={`${stage.name} stage - ${requests.length} project${requests.length !== 1 ? 's' : ''}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-medium">{stage.name}</h3>
        <span className="text-xs text-muted-foreground">
          {totalCount && totalCount > requests.length
            ? `${requests.length} of ${totalCount}`
            : requests.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg border bg-card"
              />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className={cn(
            'flex h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground',
            isOver && 'border-primary/40 bg-primary/5'
          )}>
            {isOver ? 'Drop here' : 'No projects'}
          </div>
        ) : (
          requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onMove={onMoveRequest}
              onDelete={onDeleteRequest}
              availableStages={availableStages.filter(
                (s) => s.id !== stage.id
              )}
              canDelete={canDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
