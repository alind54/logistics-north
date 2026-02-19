import { useState, useEffect } from 'react';
import type { Request } from '../../types';
import KanbanBoard from './KanbanBoard';
import RequestFormModal from './RequestFormModal';
import { useAttachmentCounts } from '../../hooks/useAttachmentCounts';
import { useAttachments } from '../../hooks/useAttachments';

interface RequestTrackerProps {
  requests: Request[];
  addRequest: (description: string, notes: string, isUrgent?: boolean) => Promise<string | undefined> | void;
  updateRequest: (id: string, description: string, notes: string, isUrgent?: boolean) => void;
  deleteRequest: (id: string) => void;
  moveRequest: (id: string, direction: 'forward' | 'backward') => void;
  moveRequestToStage: (id: string, targetStageId: string) => void;
  archiveRequest: (id: string) => void;
  getRequestsByStage: (stageId: string) => Request[];
  projectId?: string | null;
  showNewRequestModal?: boolean;
  onCloseNewRequestModal?: () => void;
}

export default function RequestTracker({
  addRequest,
  updateRequest,
  deleteRequest,
  moveRequest,
  moveRequestToStage,
  archiveRequest,
  getRequestsByStage,
  projectId,
  showNewRequestModal,
  onCloseNewRequestModal,
}: RequestTrackerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const { counts: attachmentCounts, refreshCounts } = useAttachmentCounts(projectId ?? null);
  const { uploadFile } = useAttachments(null);

  // Open modal when parent triggers it
  useEffect(() => {
    if (showNewRequestModal) {
      setEditingRequest(null);
      setShowModal(true);
    }
  }, [showNewRequestModal]);

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
    onCloseNewRequestModal?.();
  };

  return (
    <div>
      <KanbanBoard
        getRequestsByStage={getRequestsByStage}
        onMove={moveRequest}
        onMoveToStage={moveRequestToStage}
        onEdit={handleEdit}
        onDelete={deleteRequest}
        onArchive={archiveRequest}
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
