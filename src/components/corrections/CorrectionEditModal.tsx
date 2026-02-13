import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import { STAGES } from '../../constants';
import type { Request, Project } from '../../types';

interface CorrectionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request | null;
  projects: Project[];
  onSave: (id: string, updates: Record<string, unknown>, reason: string) => void;
}

export default function CorrectionEditModal({
  isOpen,
  onClose,
  request,
  projects,
  onSave,
}: CorrectionEditModalProps) {
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [stageId, setStageId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (request) {
      setDescription(request.description);
      setNotes(request.notes);
      setStageId(request.stage);
      setProjectId(request.project_id);
      setReason('');
    }
  }, [request]);

  const handleSave = () => {
    if (!request || reason.trim().length < 10) return;

    const updates: Record<string, unknown> = {};
    if (description !== request.description) updates.description = description;
    if (notes !== request.notes) updates.notes = notes;
    if (stageId !== request.stage) updates.stage_id = stageId;
    if (projectId !== request.project_id) updates.project_id = projectId;

    onSave(request.id, updates, reason.trim());
    onClose();
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Request (Admin Correction)">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            You are making an admin correction. All changes will be logged in the audit trail.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {STAGES.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for correction
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this correction is being made (minimum 10 characters)..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
          />
          <p className={`text-xs mt-1 ${reason.trim().length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
            {reason.trim().length}/10 characters minimum
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={reason.trim().length < 10}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}
