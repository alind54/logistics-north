import { CheckCircle2, Circle, Edit2, Trash2 } from 'lucide-react';
import type { Todo } from '../../types';

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

export default function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete this to-do?')) {
      onDelete(todo.id);
    }
  };

  return (
    <div
      className={`rounded-lg shadow-sm border p-4 transition-all ${
        todo.completed
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
          : 'bg-white border-gray-100 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(todo.id)}
          className="mt-0.5 flex-shrink-0 transition-colors"
        >
          {todo.completed ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : (
            <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-base ${
              todo.completed ? 'line-through text-gray-400' : 'text-gray-800'
            }`}
          >
            {todo.task}
          </p>
          {todo.notes && (
            <p
              className={`text-sm mt-1 px-2 py-1 rounded-md ${
                todo.completed
                  ? 'bg-green-100/50 text-gray-400'
                  : 'bg-gray-50 text-gray-500'
              }`}
            >
              {todo.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(todo)}
            className="p-1.5 rounded hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onMouseDown={handleDelete}
            className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
