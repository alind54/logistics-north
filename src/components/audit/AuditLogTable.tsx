import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { AuditLog } from '../../types';
import AuditLogDetailModal from './AuditLogDetailModal';
import { STAGES } from '../../constants';

interface Props {
  logs: AuditLog[];
  loading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function formatAction(log: AuditLog): string {
  const changes = log.changes as { old?: Record<string, unknown>; new?: Record<string, unknown> };
  switch (log.action) {
    case 'create':
      return `Created ${log.entity_type}`;
    case 'update':
      return `Updated ${log.entity_type}`;
    case 'delete':
      return `Deleted ${log.entity_type}`;
    case 'move_stage': {
      const oldStage = STAGES.find(s => s.id === changes.old?.stage_id)?.name ?? changes.old?.stage_id;
      const newStage = STAGES.find(s => s.id === changes.new?.stage_id)?.name ?? changes.new?.stage_id;
      return `Moved from ${oldStage} to ${newStage}`;
    }
    case 'correction':
      return `Correction: ${(log.metadata as Record<string, unknown>)?.correction_type ?? 'unknown'}`;
    default:
      return log.action.replace('_', ' ');
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const actionColors: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  move_stage: 'bg-purple-100 text-purple-700',
  correction: 'bg-amber-100 text-amber-700',
  upload: 'bg-cyan-100 text-cyan-700',
  delete_file: 'bg-orange-100 text-orange-700',
};

export default function AuditLogTable({ logs, loading, totalCount, page, pageSize, onPageChange }: Props) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading audit logs...</div>;
  }

  if (logs.length === 0) {
    return <div className="text-center py-12 text-gray-400">No audit log entries found.</div>;
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Project</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Details</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{timeAgo(log.created_at)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{log.user_name || log.user_email || 'Unknown'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${actionColors[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
                    {log.action.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 capitalize">{log.entity_type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{log.project_name ?? '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{formatAction(log)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="p-1 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">{totalCount} entries</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <AuditLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}
