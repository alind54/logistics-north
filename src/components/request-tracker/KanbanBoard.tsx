import type { Request } from '../../types';
import { STAGES } from '../../constants';
import StageColumn from './StageColumn';

interface KanbanBoardProps {
  getRequestsByStage: (stageId: string) => Request[];
  onMove: (id: string, direction: 'forward' | 'backward') => void;
  onEdit: (request: Request) => void;
  onDelete: (id: string) => void;
}

export default function KanbanBoard({ getRequestsByStage, onMove, onEdit, onDelete }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {STAGES.map((stage, index) => (
        <StageColumn
          key={stage.id}
          stage={stage}
          requests={getRequestsByStage(stage.id)}
          stageIndex={index}
          totalStages={STAGES.length}
          onMove={onMove}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
