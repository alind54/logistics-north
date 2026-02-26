import { Loader2, RotateCcw, Archive } from 'lucide-react';
import { useArchivedRequests } from '../../hooks/useArchivedRequests';

interface ArchiveViewProps {
  projectId: string | null;
}

export default function ArchiveView({ projectId }: ArchiveViewProps) {
  const { archivedRequests, loading, restoreRequest } = useArchivedRequests(projectId);

  const getPathLabel = (stageId: string) => {
    if (stageId === 'done_orders') return 'Orders';
    if (stageId === 'done_contracts') return 'Contracts';
    return 'Unknown';
  };

  const handleRestore = (id: string, description: string) => {
    if (window.confirm(`Restore "${description}" back to its done stage?`)) {
      restoreRequest(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (archivedRequests.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No archived requests</p>
        <p className="text-sm text-gray-400 mt-1">
          Completed requests that are archived will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-700">
          Archived Requests ({archivedRequests.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Path</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Archived</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Archived By</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {archivedRequests.map(req => (
              <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-700 max-w-xs truncate">{req.description}</div>
                  {req.notes && <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{req.notes}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    req.stage === 'done_orders'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-teal-100 text-teal-700'
                  }`}>
                    {getPathLabel(req.stage)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {new Date(req.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">
                  {new Date(req.deleted_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[120px]">{req.archiver_name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleRestore(req.id, req.description)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
