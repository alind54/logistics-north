import { prisma } from '../db';
import type { TodoCreateInput, TodoUpdateInput } from '@request-tracker/shared';

export async function listTodos(userId: string) {
  return prisma.todo.findMany({
    where: { userId },
    orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function createTodo(userId: string, data: TodoCreateInput) {
  return prisma.todo.create({
    data: {
      userId,
      task: data.task,
      notes: data.notes ?? null,
    },
  });
}

export async function updateTodo(id: string, userId: string, data: TodoUpdateInput) {
  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo || todo.userId !== userId) {
    throw new Error('Todo not found');
  }

  return prisma.todo.update({
    where: { id },
    data: {
      ...(data.task !== undefined && { task: data.task }),
      ...(data.notes !== undefined && { notes: data.notes ?? null }),
      ...(data.completed !== undefined && { completed: data.completed }),
    },
  });
}

export async function deleteTodo(id: string, userId: string) {
  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo || todo.userId !== userId) {
    throw new Error('Todo not found');
  }

  await prisma.todo.delete({ where: { id } });
}

export async function clearCompletedTodos(userId: string) {
  const result = await prisma.todo.deleteMany({
    where: { userId, completed: true },
  });
  return result.count;
}
