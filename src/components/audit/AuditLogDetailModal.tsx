import type { AuditLog } from '../../types';
import Modal from '../Modal';

interface Props {
  log: AuditLog | null;
  onClose: () => void;
}

export default function AuditLogDetailModal({ log, onClose }: Props) {
  if (!log) return null;

  const changes = log.changes as { old?: Record<string, unknown>; new?: Record<string, unknown> };
  const metadata = log.metadata as Record<string, unknown>;

  return (
    <Modal isOpen={!!log} onClose={onClose} title="Audit Log Detail">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Action</span>
            <p className="font-medium capitalize">{log.action.replace('_', ' ')}</p>
          </div>
          <div>
            <span className="text-gray-500">Entity Type</span>
            <p className="font-medium capitalize">{log.entity_type}</p>
          </div>
          <div>
            <span className="text-gray-500">User</span>
            <p className="font-medium">{log.user_name || log.user_email || 'Unknown'}</p>
          </div>
          <div>
            <span className="text-gray-500">Project</span>
            <p className="font-medium">{log.project_name ?? 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Timestamp</span>
            <p className="font-medium">{new Date(log.created_at).toLocaleString()}</p>
          </div>
        </div>

        {metadata.reason != null && (
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
            <span className="text-xs font-medium text-amber-700">Correction Reason</span>
            <p className="text-sm text-amber-800 mt-1">{String(metadata.reason)}</p>
          </div>
        )}

        {changes.old && (
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">Previous Values</span>
            <pre className="mt-1 bg-red-50 rounded-lg p-3 text-xs text-red-800 overflow-x-auto border border-red-100">
              {JSON.stringify(changes.old, null, 2)}
            </pre>
          </div>
        )}

        {changes.new && (
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase">New Values</span>
            <pre className="mt-1 bg-emerald-50 rounded-lg p-3 text-xs text-emerald-800 overflow-x-auto border border-emerald-100">
              {JSON.stringify(changes.new, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}
