import { useState } from 'react';
import { RotateCcw, FileText, ListTodo, Loader2, Inbox } from 'lucide-react';
import type { useCorrections } from '../../hooks/useCorrections';
import CorrectionReasonModal from './CorrectionReasonModal';

interface DeletedItemsTableProps {
  corrections: ReturnType<typeof useCorrections>;
}

export default function DeletedItemsTable({ corrections }: DeletedItemsTableProps) {
  const { deletedRequests, deletedTodos, loading, restoreRequest, restoreTodo } = corrections;

  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    onConfirm: (reason: string) => void;
  }>({ isOpen: false, title: '', onConfirm: () => {} });

  const handleRestoreRequest = (id: string, description: string) => {
    setReasonModal({
      isOpen: true,
      title: 'Restore Request',
      description: `Restore the request "${description}" back to active status.`,
      onConfirm: (reason) => restoreRequest(id, reason),
    });
  };

  const handleRestoreTodo = (id: string, task: string) => {
    setReasonModal({
      isOpen: true,
      title: 'Restore Todo',
      description: `Restore the todo "${task}" back to active status.`,
      onConfirm: (reason) => restoreTodo(id, reason),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  const hasDeletedItems = deletedRequests.length > 0 || deletedTodos.length > 0;

  if (!hasDeletedItems) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No deleted items</p>
        <p className="text-sm text-gray-400 mt-1">Soft-deleted requests and todos will appear here for restoration.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Deleted Requests */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Deleted Requests ({deletedRequests.length})
            </h3>
          </div>

          {deletedRequests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-400">No deleted requests.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deleted</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {deletedRequests.map(request => (
                      <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-500 max-w-sm truncate">
                            {request.description}
                          </div>
                          {request.notes && (
                            <div className="text-xs text-gray-400 mt-0.5 max-w-sm truncate">{request.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">{request.project_name ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-400">
                            {request.deleted_at ? new Date(request.deleted_at).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => handleRestoreRequest(request.id, request.description)}
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
          )}
        </div>

        {/* Deleted Todos */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ListTodo className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Deleted Todos ({deletedTodos.length})
            </h3>
          </div>

          {deletedTodos.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-400">No deleted todos.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deleted</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {deletedTodos.map(todo => (
                      <tr key={todo.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-500 max-w-sm truncate">
                            {todo.task}
                          </div>
                          {todo.notes && (
                            <div className="text-xs text-gray-400 mt-0.5 max-w-sm truncate">{todo.notes}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">{todo.project_name ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-400">
                            {todo.deleted_at ? new Date(todo.deleted_at).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => handleRestoreTodo(todo.id, todo.task)}
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
          )}
        </div>
      </div>

      <CorrectionReasonModal
        isOpen={reasonModal.isOpen}
        onClose={() => setReasonModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={reasonModal.onConfirm}
        title={reasonModal.title}
        description={reasonModal.description}
      />
    </>
  );
}
