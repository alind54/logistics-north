import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Request } from '../../types';
import KanbanBoard from './KanbanBoard';
import RequestFormModal from './RequestFormModal';

interface RequestTrackerProps {
  requests: Request[];
  addRequest: (description: string, notes: string) => void;
  updateRequest: (id: number, description: string, notes: string) => void;
  deleteRequest: (id: number) => void;
  moveRequest: (id: number, direction: 'forward' | 'backward') => void;
  clearDoneRequests: () => number;
  getRequestsByStage: (stageId: string) => Request[];
}

export default function RequestTracker({
  requests,
  addRequest,
  updateRequest,
  deleteRequest,
  moveRequest,
  clearDoneRequests,
  getRequestsByStage,
}: RequestTrackerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);

  const doneCount = requests.filter(r => r.stage === 'done').length;

  const handleEdit = (request: Request) => {
    setEditingRequest(request);
    setShowModal(true);
  };

  const handleSubmit = (description: string, notes: string) => {
    if (editingRequest) {
      updateRequest(editingRequest.id, description, notes);
    } else {
      addRequest(description, notes);
    }
    setEditingRequest(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRequest(null);
  };

  const handleClearDone = () => {
    if (window.confirm(`Clear all ${doneCount} done item(s)?`)) {
      const count = clearDoneRequests();
      alert(`Cleared ${count} done item(s)!`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          {doneCount > 0 && (
            <button
              onClick={handleClearDone}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all shadow-md text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Clear Done Items ({doneCount})
            </button>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      <KanbanBoard
        getRequestsByStage={getRequestsByStage}
        onMove={moveRequest}
        onEdit={handleEdit}
        onDelete={deleteRequest}
      />

      <RequestFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingRequest ? { description: editingRequest.description, notes: editingRequest.notes } : null}
      />
    </div>
  );
}
