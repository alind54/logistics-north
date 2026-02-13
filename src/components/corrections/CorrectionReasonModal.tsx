import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../Modal';

interface CorrectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description?: string;
}

export default function CorrectionReasonModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}: CorrectionReasonModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim().length < 10) return;
    onConfirm(reason.trim());
    setReason('');
    onClose();
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            {description || 'This is an admin correction. A reason is required and will be logged in the audit trail.'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for correction
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this correction is being made (minimum 10 characters)..."
            rows={3}
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
            onClick={handleConfirm}
            disabled={reason.trim().length < 10}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-red-500 rounded-lg hover:from-amber-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            Confirm Correction
          </button>
        </div>
      </div>
    </Modal>
  );
}
