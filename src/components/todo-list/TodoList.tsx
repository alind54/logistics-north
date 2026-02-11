import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Todo } from '../../types';
import TodoItem from './TodoItem';
import TodoFormModal from './TodoFormModal';

interface TodoListProps {
  todos: Todo[];
  addTodo: (task: string, notes: string) => void;
  updateTodo: (id: number, task: string, notes: string) => void;
  deleteTodo: (id: number) => void;
  toggleTodo: (id: number) => void;
  clearCompleted: () => number;
}

export default function TodoList({
  todos,
  addTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  clearCompleted,
}: TodoListProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const completedCount = todos.filter(t => t.completed).length;

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setShowModal(true);
  };

  const handleSubmit = (task: string, notes: string) => {
    if (editingTodo) {
      updateTodo(editingTodo.id, task, notes);
    } else {
      addTodo(task, notes);
    }
    setEditingTodo(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTodo(null);
  };

  const handleClearCompleted = () => {
    if (window.confirm(`Clear all ${completedCount} completed task(s)?`)) {
      const count = clearCompleted();
      alert(`Cleared ${count} completed task(s)!`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          {completedCount > 0 && (
            <button
              onClick={handleClearCompleted}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all shadow-md text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Clear Completed ({completedCount})
            </button>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New To-Do
        </button>
      </div>

      <div className="space-y-3">
        {todos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No to-dos yet</p>
            <p className="text-sm mt-1">Click "New To-Do" to get started</p>
          </div>
        ) : (
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onEdit={handleEdit}
              onDelete={deleteTodo}
            />
          ))
        )}
      </div>

      <TodoFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingTodo ? { task: editingTodo.task, notes: editingTodo.notes } : null}
      />
    </div>
  );
}
