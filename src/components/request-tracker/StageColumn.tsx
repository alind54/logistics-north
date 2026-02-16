import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Request, Stage } from '../../types';
import RequestCard from './RequestCard';

const MAX_VISIBLE = 3;

interface StageColumnProps {
  stage: Stage;
  requests: Request[];
  canMoveBackward: boolean;
  canMoveForward: boolean;
  onMove: (id: string, direction: 'forward' | 'backward') => void;
  onEdit: (request: Request) => void;
  onDelete: (id: string) => void;
  attachmentCounts?: Record<string, number>;
}

export default function StageColumn({ stage, requests, canMoveBackward, canMoveForward, onMove, onEdit, onDelete, attachmentCounts }: StageColumnProps) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = requests.length > MAX_VISIBLE;
  const showCollapsed = hasOverflow && !expanded;

  return (
    <div className="flex flex-col bg-gray-50/80 rounded-xl overflow-hidden border border-gray-200/60 min-h-[150px]">
      <div className={`bg-gradient-to-r ${stage.color} text-white px-3 py-2 flex items-center justify-between`}>
        <span className="font-semibold text-xs truncate">{stage.name}</span>
        <span className="bg-white/25 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
          {requests.length}
        </span>
      </div>
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 space-y-2 transition-colors ${
              showCollapsed ? 'max-h-[280px] overflow-hidden relative' : 'overflow-y-auto max-h-[calc(100vh-300px)]'
            } ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
          >
            {requests.length === 0 && !snapshot.isDraggingOver ? (
              <p className="text-xs text-gray-400 text-center py-4">No items</p>
            ) : (
              requests.map((request, index) => (
                <Draggable key={request.id} draggableId={request.id} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={dragSnapshot.isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                    >
                      <RequestCard
                        request={request}
                        canMoveBackward={canMoveBackward}
                        canMoveForward={canMoveForward}
                        onMove={onMove}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        isDragging={dragSnapshot.isDragging}
                        attachmentCount={attachmentCounts?.[request.id] ?? 0}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
            {showCollapsed && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-8 pb-2 flex justify-center">
                <button
                  onClick={() => setExpanded(true)}
                  className="flex items-center gap-1 px-3 py-1 bg-white text-gray-600 text-xs font-medium rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <ChevronDown className="w-3 h-3" />
                  +{requests.length - MAX_VISIBLE} more
                </button>
              </div>
            )}
          </div>
        )}
      </Droppable>
      {expanded && hasOverflow && (
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center justify-center gap-1 px-3 py-1.5 text-gray-500 text-xs font-medium hover:bg-gray-100 transition-colors border-t border-gray-200"
        >
          <ChevronUp className="w-3 h-3" />
          Show less
        </button>
      )}
    </div>
  );
}
