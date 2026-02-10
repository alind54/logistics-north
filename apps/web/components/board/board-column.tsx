'use client';

import { useDroppable } from '@dnd-kit/core';
import { RequestCard } from './request-card';
import { cn } from '@request-tracker/ui';
import type { RequestListItemDTO } from '@request-tracker/shared';

// Stage → color mapping for visual identity
const STAGE_COLORS: Record<string, { border: string; bg: string; text: string; pill: string }> = {
  'mrf':                 { border: 'border-t-violet-500',  bg: 'bg-violet-500/10',  text: 'text-violet-400',  pill: 'bg-violet-500/20 text-violet-300' },
  'supplier assignment': { border: 'border-t-blue-500',    bg: 'bg-blue-500/10',    text: 'text-blue-400',    pill: 'bg-blue-500/20 text-blue-300' },
  'requisition':         { border: 'border-t-cyan-500',    bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    pill: 'bg-cyan-500/20 text-cyan-300' },
  'order':               { border: 'border-t-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', pill: 'bg-emerald-500/20 text-emerald-300' },
  'inventory':           { border: 'border-t-amber-500',   bg: 'bg-amber-500/10',   text: 'text-amber-400',   pill: 'bg-amber-500/20 text-amber-300' },
  'contract':            { border: 'border-t-purple-500',  bg: 'bg-purple-500/10',  text: 'text-purple-400',  pill: 'bg-purple-500/20 text-purple-300' },
  'certificate':         { border: 'border-t-orange-500',  bg: 'bg-orange-500/10',  text: 'text-orange-400',  pill: 'bg-orange-500/20 text-orange-300' },
  'done':                { border: 'border-t-green-500',   bg: 'bg-green-500/10',   text: 'text-green-400',   pill: 'bg-green-500/20 text-green-300' },
};

const DEFAULT_COLORS = { border: 'border-t-slate-500', bg: 'bg-slate-500/10', text: 'text-slate-400', pill: 'bg-slate-500/20 text-slate-300' };

function getStageColors(stageName: string) {
  return STAGE_COLORS[stageName.toLowerCase()] ?? DEFAULT_COLORS;
}

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

  const colors = getStageColors(stage.name);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-w-[180px] max-w-[240px] flex-1 flex-shrink-0 flex-col rounded-lg border border-t-[3px] bg-muted/30 transition-all',
        colors.border,
        isOver && 'ring-2 ring-primary/40 bg-primary/5'
      )}
      role="region"
      aria-label={`${stage.name} stage - ${requests.length} project${requests.length !== 1 ? 's' : ''}`}
    >
      {/* Column Header */}
      <div className={cn('flex items-center justify-between px-3 py-2', colors.bg)}>
        <h3 className={cn('text-sm font-semibold', colors.text)}>{stage.name}</h3>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', colors.pill)}>
          {totalCount && totalCount > requests.length
            ? `${requests.length}/${totalCount}`
            : requests.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex-1 space-y-1.5 overflow-y-auto p-1.5">
        {isLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-md border bg-card"
              />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className={cn(
            'flex h-[72px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground',
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
