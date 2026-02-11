import type { Stage } from './types';

export const STAGES: Stage[] = [
  { id: 'mrf', name: 'MRF', color: 'from-blue-500 to-blue-600' },
  { id: 'supplier', name: 'Supplier Assignment', color: 'from-purple-500 to-purple-600' },
  { id: 'requisition', name: 'Requisition', color: 'from-amber-500 to-amber-600' },
  { id: 'order', name: 'Order', color: 'from-orange-500 to-orange-600' },
  { id: 'inventory', name: 'Inventory', color: 'from-emerald-500 to-emerald-600' },
  { id: 'done', name: 'Done', color: 'from-gray-600 to-gray-700' },
];

export const STORAGE_KEYS = {
  REQUESTS: 'logisticsRequests',
  TODOS: 'logisticsTodos',
} as const;
