'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Select } from '@request-tracker/ui';
import { BoardColumn } from './board-column';
import { CreateRequestDialog } from './create-request-dialog';
import type { FlowType, RequestListItemDTO } from '@request-tracker/shared';
import { useBoardEvents } from '@/hooks/use-board-events';

interface BoardColumn {
  stage: {
    id: string;
    name: string;
    orderIndex: number;
  };
  requests: RequestListItemDTO[];
}

interface BoardProps {
  initialFlowType: FlowType;
  initialColumns: BoardColumn[];
}

export function Board({ initialFlowType, initialColumns }: BoardProps) {
  const router = useRouter();
  const [flowType, setFlowType] = useState<FlowType>(initialFlowType);
  const [columns, setColumns] = useState<BoardColumn[]>(initialColumns);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch board data when flow type changes
  const fetchBoard = useCallback(async (ft: FlowType) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/board?flowType=${ft}`);
      if (res.ok) {
        const data = await res.json();
        setColumns(data.data.columns);
      }
    } catch (error) {
      console.error('Failed to fetch board:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (flowType !== initialFlowType) {
      fetchBoard(flowType);
    }
  }, [flowType, initialFlowType, fetchBoard]);

  // Listen for real-time board updates via SSE
  useBoardEvents((event) => {
    if (event.type === 'STAGE_MOVED' || event.type === 'REQUEST_CREATED') {
      fetchBoard(flowType);
    }
  });

  // Handle moving a request to a new stage
  const handleMoveRequest = async (requestId: string, toStageId: string) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/move-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStageId }),
      });

      if (res.ok) {
        // Optimistically update the UI
        setColumns((prevColumns) => {
          const newColumns = prevColumns.map((col) => ({
            ...col,
            requests: [...col.requests],
          }));

          // Find and remove the request from its current column
          let movedRequest: RequestListItemDTO | null = null;
          for (const col of newColumns) {
            const idx = col.requests.findIndex((r) => r.id === requestId);
            if (idx !== -1) {
              movedRequest = col.requests[idx] ?? null;
              col.requests.splice(idx, 1);
              break;
            }
          }

          // Add to the new column
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
      } else {
        // If failed, refresh the board
        fetchBoard(flowType);
      }
    } catch (error) {
      console.error('Failed to move request:', error);
      fetchBoard(flowType);
    }
  };

  // Handle request created
  const handleRequestCreated = () => {
    setShowCreateDialog(false);
    fetchBoard(flowType);
    router.refresh();
  };

  // Get all stages for the move menu
  const allStages = columns.map((c) => ({
    id: c.stage.id,
    name: c.stage.name,
  }));

  return (
    <div className="flex h-full flex-col">
      {/* Board Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Request Board</h1>
          <Select
            value={flowType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFlowType(e.target.value as FlowType)}
            className="w-32"
          >
            <option value="ORDER">Order</option>
            <option value="CONTRACT">Contract</option>
          </Select>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          New Request
        </Button>
      </div>

      {/* Board Columns */}
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <BoardColumn
            key={column.stage.id}
            stage={column.stage}
            requests={column.requests}
            onMoveRequest={handleMoveRequest}
            availableStages={allStages}
            isLoading={isLoading}
          />
        ))}
      </div>

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
