import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import type { Request } from '../../types';
import { STAGES, SHARED_STAGES, ORDER_PATH, CONTRACT_PATH, STAGE_TRANSITIONS } from '../../constants';
import StageColumn from './StageColumn';

interface KanbanBoardProps {
  getRequestsByStage: (stageId: string) => Request[];
  onMove: (id: string, direction: 'forward' | 'backward') => void;
  onMoveToStage: (id: string, targetStageId: string) => void;
  onEdit: (request: Request) => void;
  onDelete: (id: string) => void;
  attachmentCounts?: Record<string, number>;
}

function getStage(id: string) {
  return STAGES.find(s => s.id === id)!;
}

export default function KanbanBoard({ getRequestsByStage, onMove, onMoveToStage, onEdit, onDelete, attachmentCounts }: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    onMoveToStage(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Shared stages row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {SHARED_STAGES.map((id) => {
          const stage = getStage(id);
          const transitions = STAGE_TRANSITIONS[id];
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              requests={getRequestsByStage(stage.id)}
              canMoveBackward={transitions.prev !== null}
              canMoveForward={transitions.next.length === 1}
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
              attachmentCounts={attachmentCounts}
            />
          );
        })}
      </div>

      {/* Orders path */}
      <div className="mb-2">
        <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Orders Path</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {ORDER_PATH.map((id) => {
          const stage = getStage(id);
          const transitions = STAGE_TRANSITIONS[id];
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              requests={getRequestsByStage(stage.id)}
              canMoveBackward={transitions.prev !== null}
              canMoveForward={transitions.next.length === 1}
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
              attachmentCounts={attachmentCounts}
            />
          );
        })}
      </div>

      {/* Contracts path */}
      <div className="mb-2">
        <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Contracts Path</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CONTRACT_PATH.map((id) => {
          const stage = getStage(id);
          const transitions = STAGE_TRANSITIONS[id];
          return (
            <StageColumn
              key={stage.id}
              stage={stage}
              requests={getRequestsByStage(stage.id)}
              canMoveBackward={transitions.prev !== null}
              canMoveForward={transitions.next.length === 1}
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
              attachmentCounts={attachmentCounts}
            />
          );
        })}
      </div>
    </DragDropContext>
  );
}
