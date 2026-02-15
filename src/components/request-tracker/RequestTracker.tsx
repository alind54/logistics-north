import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Request } from '../../types';
import KanbanBoard from './KanbanBoard';
import RequestFormModal from './RequestFormModal';
import RoleGate from '../auth/RoleGate';
import { useAttachmentCounts } from '../../hooks/useAttachmentCounts';
import { useAttachments } from '../../hooks/useAttachments';

interface RequestTrackerProps {
  requests: Request[];
  addRequest: (description: string, notes: string, isUrgent?: boolean) => Promise<string | undefined> | void;
  updateRequest: (id: string, description: string, notes: string, isUrgent?: boolean) => void;
  deleteRequest: (id: string) => void;
  moveRequest: (id: string, direction: 'forward' | 'backward') => void;
  moveRequestToStage: (id: string, targetStageId: string) => void;
  clearDoneRequests: () => number | Promise<number>;
  getRequestsByStage: (stageId: string) => Request[];
  projectId?: string | null;
}

export default function RequestTracker({
  requests,
  addRequest,
  updateRequest,
  deleteRequest,
  moveRequest,
  moveRequestToStage,
  clearDoneRequests,
  getRequestsByStage,
  projectId,
}: RequestTrackerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const { counts: attachmentCounts, refreshCounts } = useAttachmentCounts(projectId ?? null);
  const { uploadFile } = useAttachments(null);

  const doneCount = requests.filter(r => r.stage === 'done').length;

  const handleEdit = (request: Request) => {
    setEditingRequest(request);
    setShowModal(true);
  };

  const handleSubmit = async (description: string, notes: string, isUrgent: boolean, stagedFiles?: File[]) => {
    if (editingRequest) {
      updateRequest(editingRequest.id, description, notes, isUrgent);
    } else {
      const newId = await addRequest(description, notes, isUrgent);
      if (newId && stagedFiles && stagedFiles.length > 0 && projectId) {
        for (const file of stagedFiles) {
          await uploadFile(newId, projectId, file);
        }
        refreshCounts();
      }
    }
    setEditingRequest(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRequest(null);
  };

  const handleClearDone = async () => {
    if (window.confirm(`Clear all ${doneCount} done item(s)?`)) {
      const count = await clearDoneRequests();
      alert(`Cleared ${count} done item(s)!`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <RoleGate allowed={['admin', 'manager']}>
            {doneCount > 0 && (
              <button
                onClick={handleClearDone}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all shadow-md text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Clear Done Items ({doneCount})
              </button>
            )}
          </RoleGate>
        </div>
        <RoleGate allowed={['admin', 'manager']}>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </RoleGate>
      </div>

      <KanbanBoard
        getRequestsByStage={getRequestsByStage}
        onMove={moveRequest}
        onMoveToStage={moveRequestToStage}
        onEdit={handleEdit}
        onDelete={deleteRequest}
        attachmentCounts={attachmentCounts}
      />

      <RequestFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingRequest ? { description: editingRequest.description, notes: editingRequest.notes, is_urgent: editingRequest.is_urgent } : null}
        requestId={editingRequest?.id}
        projectId={projectId}
      />
    </div>
  );
}
