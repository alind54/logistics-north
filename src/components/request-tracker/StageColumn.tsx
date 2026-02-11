import type { Request, Stage } from '../../types';
import RequestCard from './RequestCard';

interface StageColumnProps {
  stage: Stage;
  requests: Request[];
  stageIndex: number;
  totalStages: number;
  onMove: (id: string, direction: 'forward' | 'backward') => void;
  onEdit: (request: Request) => void;
  onDelete: (id: string) => void;
}

export default function StageColumn({ stage, requests, stageIndex, totalStages, onMove, onEdit, onDelete }: StageColumnProps) {
  return (
    <div className="flex flex-col bg-gray-50/80 rounded-xl overflow-hidden border border-gray-200/60 min-h-[200px]">
      <div className={`bg-gradient-to-r ${stage.color} text-white px-3 py-2.5 flex items-center justify-between`}>
        <span className="font-semibold text-sm truncate">{stage.name}</span>
        <span className="bg-white/25 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
          {requests.length}
        </span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        {requests.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No items</p>
        ) : (
          requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              stageIndex={stageIndex}
              totalStages={totalStages}
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
