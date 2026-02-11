import { useLocalStorage } from './useLocalStorage';
import type { Request } from '../types';
import { STAGES, STORAGE_KEYS } from '../constants';

export function useRequests() {
  const [requests, setRequests] = useLocalStorage<Request[]>(STORAGE_KEYS.REQUESTS, []);

  const addRequest = (description: string, notes: string) => {
    const newRequest: Request = {
      id: Date.now(),
      stage: STAGES[0].id,
      description,
      notes,
    };
    setRequests(prev => [...prev, newRequest]);
  };

  const updateRequest = (id: number, description: string, notes: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, description, notes } : r));
  };

  const deleteRequest = (id: number) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const moveRequest = (id: number, direction: 'forward' | 'backward') => {
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      const currentIndex = STAGES.findIndex(s => s.id === r.stage);
      const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
      if (newIndex < 0 || newIndex >= STAGES.length) return r;
      return { ...r, stage: STAGES[newIndex].id };
    }));
  };

  const clearDoneRequests = (): number => {
    const doneCount = requests.filter(r => r.stage === 'done').length;
    setRequests(prev => prev.filter(r => r.stage !== 'done'));
    return doneCount;
  };

  const getRequestsByStage = (stageId: string): Request[] => {
    return requests.filter(r => r.stage === stageId);
  };

  return {
    requests,
    addRequest,
    updateRequest,
    deleteRequest,
    moveRequest,
    clearDoneRequests,
    getRequestsByStage,
  };
}
