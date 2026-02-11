import { ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import type { Request } from '../../types';

interface RequestCardProps {
  request: Request;
  stageIndex: number;
  totalStages: number;
  onMove: (id: number, direction: 'forward' | 'backward') => void;
  onEdit: (request: Request) => void;
  onDelete: (id: number) => void;
}

export default function RequestCard({ request, stageIndex, totalStages, onMove, onEdit, onDelete }: RequestCardProps) {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      onDelete(request.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow">
      <p className="font-semibold text-gray-800 text-sm leading-snug">{request.description}</p>
      {request.notes && (
        <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-md px-2 py-1">{request.notes}</p>
      )}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1">
          {stageIndex > 0 && (
            <button
              onClick={() => onMove(request.id, 'backward')}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Move back"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(request)}
            className="p-1 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {stageIndex < totalStages - 1 && (
            <button
              onClick={() => onMove(request.id, 'forward')}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Move forward"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
