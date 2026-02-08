import { requireAuth } from '@/server/auth/session';
import { listTodos } from '@/server/todos';
import { TodoList } from '@/components/todos/todo-list';

export default async function TodosPage() {
  const user = await requireAuth();
  const todos = await listTodos(user.id);

  return (
    <div className="container py-6">
      <TodoList
        initialTodos={todos.map((t) => ({
          id: t.id,
          task: t.task,
          notes: t.notes,
          completed: t.completed,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
