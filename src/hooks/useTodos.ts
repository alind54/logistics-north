import { useLocalStorage } from './useLocalStorage';
import type { Todo } from '../types';
import { STORAGE_KEYS } from '../constants';

export function useTodos() {
  const [todos, setTodos] = useLocalStorage<Todo[]>(STORAGE_KEYS.TODOS, []);

  const addTodo = (task: string, notes: string) => {
    const newTodo: Todo = {
      id: Date.now(),
      task,
      notes,
      completed: false,
    };
    setTodos(prev => [...prev, newTodo]);
  };

  const updateTodo = (id: number, task: string, notes: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, task, notes } : t));
  };

  const deleteTodo = (id: number) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const toggleTodo = (id: number) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const clearCompleted = (): number => {
    const completedCount = todos.filter(t => t.completed).length;
    setTodos(prev => prev.filter(t => !t.completed));
    return completedCount;
  };

  return {
    todos,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    clearCompleted,
  };
}
