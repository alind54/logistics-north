import { ChevronLeft, ChevronRight, Edit2, Trash2, Paperclip, AlertTriangle } from 'lucide-react';
import type { Request } from '../../types';
import RoleGate from '../auth/RoleGate';

interface RequestCardProps {
  request: Request;
  canMoveBackward: boolean;
  canMoveForward: boolean;
  onMove: (id: string, direction: 'forward' | 'backward') => void;
  onEdit: (request: Request) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
  attachmentCount?: number;
}

export default function RequestCard({ request, canMoveBackward, canMoveForward, onMove, onEdit, onDelete, isDragging, attachmentCount }: RequestCardProps) {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      onDelete(request.id);
    }
  };

  const urgent = request.is_urgent;

  return (
    <div className={`rounded-lg shadow-sm p-3 hover:shadow-md transition-all cursor-grab ${
      isDragging ? 'shadow-lg scale-105 rotate-1 opacity-90 cursor-grabbing' : ''
    } ${
      urgent ? 'bg-red-50 border-2 border-red-400' : 'bg-white border border-gray-100'
    }`}>
      <div className="flex items-start gap-1.5">
        {urgent && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
        <p className={`font-semibold text-sm leading-snug ${urgent ? 'text-red-800' : 'text-gray-800'}`}>{request.description}</p>
      </div>
      {request.notes && (
        <p className={`text-xs mt-1.5 rounded-md px-2 py-1 ${urgent ? 'text-red-600 bg-red-100/60' : 'text-gray-500 bg-gray-50'}`}>{request.notes}</p>
      )}
      {(attachmentCount ?? 0) > 0 && (
        <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-500">
          <Paperclip className="w-3 h-3" />
          <span>{attachmentCount} file{attachmentCount !== 1 ? 's' : ''}</span>
        </div>
      )}
      <div className={`flex items-center justify-between mt-3 pt-2 border-t ${urgent ? 'border-red-200' : 'border-gray-50'}`}>
        <div className="flex items-center gap-1">
          {canMoveBackward && (
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
          <RoleGate allowed={['admin', 'manager']}>
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
          </RoleGate>
        </div>
        <div className="flex items-center gap-1">
          {canMoveForward && (
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
