import type { Stage } from './types';

export const STAGES: Stage[] = [
  { id: 'mrf', name: 'MRF', color: 'from-blue-500 to-blue-600', position: 0 },
  { id: 'supplier', name: 'Supplier Assignment', color: 'from-purple-500 to-purple-600', position: 1 },
  { id: 'requisition', name: 'Requisition', color: 'from-amber-500 to-amber-600', position: 2 },
  { id: 'order', name: 'Order', color: 'from-orange-500 to-orange-600', position: 3 },
  { id: 'inventory', name: 'Inventory', color: 'from-emerald-500 to-emerald-600', position: 4 },
  { id: 'done', name: 'Done', color: 'from-gray-600 to-gray-700', position: 5 },
];
