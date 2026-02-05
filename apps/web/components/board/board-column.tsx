'use client';

import { RequestCard } from './request-card';
import type { RequestListItemDTO } from '@request-tracker/shared';

interface BoardColumnProps {
  stage: {
    id: string;
    name: string;
    orderIndex: number;
  };
  requests: RequestListItemDTO[];
  onMoveRequest: (requestId: string, toStageId: string) => void;
  availableStages: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

export function BoardColumn({
  stage,
  requests,
  onMoveRequest,
  availableStages,
  isLoading,
}: BoardColumnProps) {
  return (
    <div
      className="flex h-full w-[300px] flex-shrink-0 flex-col rounded-lg border bg-muted/30 md:w-[320px]"
      role="region"
      aria-label={`${stage.name} stage - ${requests.length} request${requests.length !== 1 ? 's' : ''}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
        <h3 className="font-medium">{stage.name}</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {requests.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg border bg-card"
              />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No requests
          </div>
        ) : (
          requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onMove={onMoveRequest}
              availableStages={availableStages.filter(
                (s) => s.id !== stage.id
              )}
            />
          ))
        )}
      </div>
    </div>
  );
}
