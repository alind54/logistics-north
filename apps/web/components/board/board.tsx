'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Button, Select } from '@request-tracker/ui';
import { BoardColumn } from './board-column';
import { RequestCard } from './request-card';
import { CreateRequestDialog } from './create-request-dialog';
import type { FlowType, RequestListItemDTO } from '@request-tracker/shared';
import { useBoardEvents } from '@/hooks/use-board-events';

interface BoardColumn {
  stage: {
    id: string;
    name: string;
    orderIndex: number;
  };
  totalCount?: number;
  requests: RequestListItemDTO[];
}

interface BoardProps {
  initialFlowType: FlowType;
  initialColumns: BoardColumn[];
  canDelete?: boolean;
}

export function Board({ initialFlowType, initialColumns, canDelete = false }: BoardProps) {
  const router = useRouter();
  const [flowType, setFlowType] = useState<FlowType>(initialFlowType);
  const [columns, setColumns] = useState<BoardColumn[]>(initialColumns);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Refs for SSE defer during drag, move debounce, and self-echo suppression
  const pendingRefetch = useRef(false);
  const movingIds = useRef(new Set<string>());
  const recentMoveIds = useRef(new Set<string>());

  // DnD sensors - require 8px movement before drag starts
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (moveError) {
      const timer = setTimeout(() => setMoveError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [moveError]);

  // Fetch board data (silent=true skips loading skeleton for background SSE refreshes)
  const fetchBoard = useCallback(async (ft: FlowType, { silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/board?flowType=${ft}`);
      if (res.ok) {
        const data = await res.json();
        setColumns(data.data.columns);
      }
    } catch (error) {
      console.error('Failed to fetch board:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (flowType !== initialFlowType) {
      fetchBoard(flowType);
    }
  }, [flowType, initialFlowType, fetchBoard]);

  // Listen for real-time board updates via SSE (defer during drag, suppress self-echo)
  useBoardEvents((event) => {
    if (event.type === 'STAGE_MOVED' || event.type === 'REQUEST_CREATED' || event.type === 'REQUEST_DELETED') {
      // Suppress self-echo: if this client initiated the move, we already updated optimistically
      const eventRequestId = event.payload?.requestId;
      if (eventRequestId && recentMoveIds.current.has(eventRequestId)) {
        recentMoveIds.current.delete(eventRequestId);
        return;
      }
      if (activeId) {
        pendingRefetch.current = true;
      } else {
        fetchBoard(flowType, { silent: true });
      }
    }
  });

  // Handle moving a request to a new stage (true optimistic — update UI before API)
  const handleMoveRequest = async (requestId: string, toStageId: string) => {
    if (movingIds.current.has(requestId)) return;
    movingIds.current.add(requestId);
    recentMoveIds.current.add(requestId);
    setMoveError(null);

    // Immediately update UI (true optimistic)
    setColumns((prevColumns) => {
      const newColumns = prevColumns.map((col) => ({
        ...col,
        requests: [...col.requests],
      }));

      let movedRequest: RequestListItemDTO | null = null;
      for (const col of newColumns) {
        const idx = col.requests.findIndex((r) => r.id === requestId);
        if (idx !== -1) {
          movedRequest = col.requests[idx] ?? null;
          col.requests.splice(idx, 1);
          break;
        }
      }

      if (movedRequest) {
        const targetCol = newColumns.find((c) => c.stage.id === toStageId);
        if (targetCol) {
          movedRequest.currentStage = {
            id: targetCol.stage.id,
            name: targetCol.stage.name,
          };
          targetCol.requests.unshift(movedRequest);
        }
      }

      return newColumns;
    });

    // Then confirm with API (revert on failure)
    try {
      const res = await fetch(`/api/requests/${requestId}/move-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStageId }),
      });

      if (!res.ok) {
        try {
          const body = await res.json();
          setMoveError(body.message || 'Failed to move project');
        } catch {
          setMoveError('Failed to move project');
        }
        fetchBoard(flowType);
      }
    } catch (error) {
      console.error('Failed to move request:', error);
      setMoveError('Failed to move project. Please try again.');
      fetchBoard(flowType);
    } finally {
      movingIds.current.delete(requestId);
      // Clean up self-echo suppression after 5s (in case SSE event never arrives)
      setTimeout(() => recentMoveIds.current.delete(requestId), 5000);
    }
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    // Flush any deferred SSE refetch (silent — no loading skeleton)
    if (pendingRefetch.current) {
      pendingRefetch.current = false;
      fetchBoard(flowType, { silent: true });
    }

    if (!over) return;

    const requestId = active.id as string;
    const toStageId = over.id as string;

    // Find which column the request is currently in
    const currentColumn = columns.find((col) =>
      col.requests.some((r) => r.id === requestId)
    );

    // Don't move if dropped on the same column
    if (currentColumn && currentColumn.stage.id === toStageId) return;

    handleMoveRequest(requestId, toStageId);
  };

  const handleDragCancel = () => {
    setActiveId(null);

    // Flush any deferred SSE refetch (silent — no loading skeleton)
    if (pendingRefetch.current) {
      pendingRefetch.current = false;
      fetchBoard(flowType, { silent: true });
    }
  };

  // Handle request created
  const handleRequestCreated = () => {
    setShowCreateDialog(false);
    fetchBoard(flowType);
    router.refresh();
  };

  // Handle deleting a request
  const handleDeleteRequest = async (requestId: string) => {
    // Optimistically remove from columns
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        requests: col.requests.filter((r) => r.id !== requestId),
      }))
    );

    try {
      const res = await fetch(`/api/requests/${requestId}`, { method: 'DELETE' });
      if (!res.ok) {
        setMoveError('Failed to delete project');
        fetchBoard(flowType);
      }
    } catch {
      setMoveError('Failed to delete project');
      fetchBoard(flowType);
    }
  };

  // Handle clearing all Done items
  const handleClearDone = async () => {
    const doneColumn = columns.find(
      (c) => c.stage.name.toLowerCase() === 'done'
    );
    if (!doneColumn || doneColumn.requests.length === 0) return;

    if (!confirm(`Clear ${doneColumn.requests.length} completed project(s)? This cannot be undone.`)) return;

    // Optimistically clear
    setColumns((prev) =>
      prev.map((col) =>
        col.stage.id === doneColumn.stage.id
          ? { ...col, requests: [] }
          : col
      )
    );

    try {
      const res = await fetch('/api/requests/clear-done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowType }),
      });
      if (!res.ok) {
        setMoveError('Failed to clear done items');
        fetchBoard(flowType);
      }
    } catch {
      setMoveError('Failed to clear done items');
      fetchBoard(flowType);
    }
  };

  // Get done column count for the clear button
  const doneCount = columns.find(
    (c) => c.stage.name.toLowerCase() === 'done'
  )?.requests.length ?? 0;

  // Get all stages for the move menu (memoized to prevent child re-renders)
  const allStages = useMemo(
    () => columns.map((c) => ({ id: c.stage.id, name: c.stage.name })),
    [columns]
  );

  // Find the active request for DragOverlay
  const activeRequest = activeId
    ? columns.flatMap((c) => c.requests).find((r) => r.id === activeId)
    : null;

  return (
    <div className="flex h-full flex-col">
      {/* Board Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Project Board</h1>
          <Select
            value={flowType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFlowType(e.target.value as FlowType)}
            className="w-32"
          >
            <option value="ORDER">Order</option>
            <option value="CONTRACT">Contract</option>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && doneCount > 0 && (
            <Button
              variant="outline"
              onClick={handleClearDone}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              Clear Done ({doneCount})
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)}>
            New Project
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {moveError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <span>{moveError}</span>
          <button
            type="button"
            className="ml-4 text-xs hover:underline"
            onClick={() => setMoveError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Board Columns with DnD */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <BoardColumn
              key={column.stage.id}
              stage={column.stage}
              requests={column.requests}
              totalCount={column.totalCount}
              onMoveRequest={handleMoveRequest}
              onDeleteRequest={canDelete ? handleDeleteRequest : undefined}
              availableStages={allStages}
              canDelete={canDelete}
              isLoading={isLoading}
            />
          ))}
        </div>

        <DragOverlay>
          {activeRequest ? (
            <RequestCard
              request={activeRequest}
              onMove={() => {}}
              availableStages={[]}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create Request Dialog */}
      {showCreateDialog && (
        <CreateRequestDialog
          flowType={flowType}
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleRequestCreated}
        />
      )}
    </div>
  );
}
