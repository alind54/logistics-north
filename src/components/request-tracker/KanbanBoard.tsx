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

function renderStageColumn(
  id: string,
  props: Omit<KanbanBoardProps, 'onMoveToStage'>
) {
  const stage = getStage(id);
  const transitions = STAGE_TRANSITIONS[id];
  return (
    <StageColumn
      key={stage.id}
      stage={stage}
      requests={props.getRequestsByStage(stage.id)}
      canMoveBackward={transitions.prev !== null}
      canMoveForward={transitions.next.length === 1}
      onMove={props.onMove}
      onEdit={props.onEdit}
      onDelete={props.onDelete}
      attachmentCounts={props.attachmentCounts}
    />
  );
}

export default function KanbanBoard({ getRequestsByStage, onMove, onMoveToStage, onEdit, onDelete, attachmentCounts }: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    onMoveToStage(draggableId, destination.droppableId);
  };

  const columnProps = { getRequestsByStage, onMove, onEdit, onDelete, attachmentCounts };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Shared stages - centered, narrower */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {SHARED_STAGES.map((id) => renderStageColumn(id, columnProps))}
      </div>

      {/* Fork indicator */}
      <div className="flex justify-center mb-4">
        <div className="flex flex-col items-center">
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-0">
            <div className="w-24 h-px bg-gray-300" />
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <div className="w-24 h-px bg-gray-300" />
          </div>
          <div className="flex w-48 justify-between">
            <div className="w-px h-4 bg-gray-300" />
            <div className="w-px h-4 bg-gray-300" />
          </div>
        </div>
      </div>

      {/* Two paths side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders path */}
        <div>
          <div className="mb-2">
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Orders Path</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {ORDER_PATH.map((id) => renderStageColumn(id, columnProps))}
          </div>
        </div>

        {/* Contracts path */}
        <div>
          <div className="mb-2">
            <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Contracts Path</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {CONTRACT_PATH.map((id) => renderStageColumn(id, columnProps))}
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
