import { useState } from 'react';
import { Edit3, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { STAGES } from '../../constants';
import type { useCorrections } from '../../hooks/useCorrections';
import CorrectionReasonModal from './CorrectionReasonModal';
import CorrectionEditModal from './CorrectionEditModal';
import BulkActionsBar from './BulkActionsBar';

interface RequestsTableProps {
  corrections: ReturnType<typeof useCorrections>;
}

export default function RequestsTable({ corrections }: RequestsTableProps) {
  const { requests, projects, loading, moveRequestStage, editRequest, softDeleteRequest, bulkMoveRequests, bulkDeleteRequests } = corrections;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingRequest, setEditingRequest] = useState<(typeof requests)[number] | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Reason modal state
  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    onConfirm: (reason: string) => void;
  }>({ isOpen: false, title: '', onConfirm: () => {} });

  // Stage dropdown state
  const [stageDropdownId, setStageDropdownId] = useState<string | null>(null);

  const getStage = (stageId: string) => STAGES.find(s => s.id === stageId);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)));
    }
  };

  const handleMoveStage = (requestId: string, targetStageId: string) => {
    setStageDropdownId(null);
    setReasonModal({
      isOpen: true,
      title: 'Move Request Stage',
      description: `Move this request to "${getStage(targetStageId)?.name ?? targetStageId}". This action will be logged.`,
      onConfirm: (reason) => moveRequestStage(requestId, targetStageId, reason),
    });
  };

  const handleDelete = (requestId: string) => {
    setReasonModal({
      isOpen: true,
      title: 'Delete Request',
      description: 'This will soft-delete the request. It can be restored later from the Deleted Items tab.',
      onConfirm: (reason) => softDeleteRequest(requestId, reason),
    });
  };

  const handleEdit = (request: (typeof requests)[number]) => {
    setEditingRequest(request);
    setShowEditModal(true);
  };

  const handleEditSave = (id: string, updates: Record<string, unknown>, reason: string) => {
    editRequest(id, updates as { description?: string; notes?: string; stage_id?: string; project_id?: string }, reason);
  };

  const handleBulkMove = (stageId: string) => {
    const ids = Array.from(selectedIds);
    setReasonModal({
      isOpen: true,
      title: 'Bulk Move Requests',
      description: `Move ${ids.length} request${ids.length !== 1 ? 's' : ''} to "${getStage(stageId)?.name ?? stageId}".`,
      onConfirm: (reason) => {
        bulkMoveRequests(ids, stageId, reason);
        setSelectedIds(new Set());
      },
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    setReasonModal({
      isOpen: true,
      title: 'Bulk Delete Requests',
      description: `Soft-delete ${ids.length} request${ids.length !== 1 ? 's' : ''}. They can be restored later.`,
      onConfirm: (reason) => {
        bulkDeleteRequests(ids, reason);
        setSelectedIds(new Set());
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="text-gray-500">No active requests found across all projects.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === requests.length && requests.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map(request => {
                const stage = getStage(request.stage);
                return (
                  <tr
                    key={request.id}
                    className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(request.id) ? 'bg-blue-50/30' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(request.id)}
                        onChange={() => toggleSelect(request.id)}
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-800 max-w-xs truncate">
                        {request.description}
                      </div>
                      {request.notes && (
                        <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{request.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setStageDropdownId(stageDropdownId === request.id ? null : request.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${stage?.color ?? 'from-gray-500 to-gray-600'}`}
                        >
                          {stage?.name ?? request.stage}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {stageDropdownId === request.id && (
                          <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-30">
                            {STAGES.map(s => (
                              <button
                                key={s.id}
                                onClick={() => handleMoveStage(request.id, s.id)}
                                disabled={s.id === request.stage}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${s.color}`} />
                                {s.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{request.project_name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(request)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit request"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(request.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onBulkMove={handleBulkMove}
        onBulkDelete={handleBulkDelete}
      />

      <CorrectionReasonModal
        isOpen={reasonModal.isOpen}
        onClose={() => setReasonModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={reasonModal.onConfirm}
        title={reasonModal.title}
        description={reasonModal.description}
      />

      <CorrectionEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRequest(null);
        }}
        request={editingRequest}
        projects={projects}
        onSave={handleEditSave}
      />
    </>
  );
}
