import { useState } from 'react';
import { Edit3, Trash2, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { useCorrections } from '../../hooks/useCorrections';
import CorrectionReasonModal from './CorrectionReasonModal';

interface TodosTableProps {
  corrections: ReturnType<typeof useCorrections>;
}

export default function TodosTable({ corrections }: TodosTableProps) {
  const { todos, loading, editTodo, softDeleteTodo } = corrections;

  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    onConfirm: (reason: string) => void;
  }>({ isOpen: false, title: '', onConfirm: () => {} });

  const [editingTodo, setEditingTodo] = useState<(typeof todos)[number] | null>(null);
  const [editTask, setEditTask] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showEditInline, setShowEditInline] = useState<string | null>(null);

  const handleToggleComplete = (todo: (typeof todos)[number]) => {
    setReasonModal({
      isOpen: true,
      title: todo.completed ? 'Mark Todo as Pending' : 'Mark Todo as Completed',
      description: `Change the status of "${todo.task}" to ${todo.completed ? 'pending' : 'completed'}.`,
      onConfirm: (reason) => editTodo(todo.id, { completed: !todo.completed }, reason),
    });
  };

  const handleDelete = (todo: (typeof todos)[number]) => {
    setReasonModal({
      isOpen: true,
      title: 'Delete Todo',
      description: 'This will soft-delete the todo. It can be restored later from the Deleted Items tab.',
      onConfirm: (reason) => softDeleteTodo(todo.id, reason),
    });
  };

  const handleStartEdit = (todo: (typeof todos)[number]) => {
    setEditingTodo(todo);
    setEditTask(todo.task);
    setEditNotes(todo.notes);
    setShowEditInline(todo.id);
  };

  const handleSaveEdit = () => {
    if (!editingTodo) return;
    const updates: { task?: string; notes?: string } = {};
    if (editTask !== editingTodo.task) updates.task = editTask;
    if (editNotes !== editingTodo.notes) updates.notes = editNotes;

    if (Object.keys(updates).length === 0) {
      setShowEditInline(null);
      setEditingTodo(null);
      return;
    }

    setReasonModal({
      isOpen: true,
      title: 'Edit Todo',
      description: 'Save changes to this todo. A reason is required for the audit trail.',
      onConfirm: (reason) => {
        editTodo(editingTodo.id, updates, reason);
        setShowEditInline(null);
        setEditingTodo(null);
      },
    });
  };

  const handleCancelEdit = () => {
    setShowEditInline(null);
    setEditingTodo(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="text-gray-500">No active todos found across all projects.</p>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {todos.map(todo => (
                <tr key={todo.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    {showEditInline === todo.id ? (
                      <input
                        type="text"
                        value={editTask}
                        onChange={(e) => setEditTask(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <span className={`text-sm font-medium ${todo.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {todo.task}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {showEditInline === todo.id ? (
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <span className="text-sm text-gray-500 max-w-xs truncate block">{todo.notes || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {todo.completed ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <Circle className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{todo.project_name ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {new Date(todo.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {showEditInline === todo.id ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(todo)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit todo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleComplete(todo)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              todo.completed
                                ? 'text-green-500 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={todo.completed ? 'Mark as pending' : 'Mark as completed'}
                          >
                            {todo.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(todo)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete todo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
