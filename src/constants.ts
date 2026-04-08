import type { Stage } from './types';

export const STAGES: Stage[] = [
  { id: 'mrf', name: 'MRF', color: 'from-blue-500 to-blue-600', position: 0 },
  { id: 'supplier', name: 'Supplier Assignment', color: 'from-purple-500 to-purple-600', position: 1 },
  { id: 'requisition', name: 'CAS', color: 'from-amber-500 to-amber-600', position: 2 },
  { id: 'order', name: 'Order', color: 'from-orange-500 to-orange-600', position: 3 },
  { id: 'inventory', name: 'Inventory', color: 'from-emerald-500 to-emerald-600', position: 4 },
  { id: 'done_orders', name: 'Done (Orders)', color: 'from-gray-600 to-gray-700', position: 5 },
  { id: 'contract', name: 'Contract', color: 'from-teal-500 to-teal-600', position: 6 },
  { id: 'certificate', name: 'Certificate', color: 'from-cyan-500 to-cyan-600', position: 7 },
  { id: 'done_contracts', name: 'Done (Contracts)', color: 'from-gray-500 to-gray-600', position: 8 },
];

export const SHARED_STAGES = ['mrf', 'supplier', 'requisition'];
export const ORDER_PATH = ['order', 'inventory', 'done_orders'];
export const CONTRACT_PATH = ['contract', 'certificate', 'done_contracts'];

export const STAGE_TRANSITIONS: Record<string, { prev: string | null; next: string[] }> = {
  'mrf':            { prev: null,          next: ['supplier'] },
  'supplier':       { prev: 'mrf',         next: ['requisition'] },
  'requisition':    { prev: 'supplier',     next: ['order', 'contract'] },
  'order':          { prev: 'requisition',  next: ['inventory'] },
  'inventory':      { prev: 'order',        next: ['done_orders'] },
  'done_orders':    { prev: 'inventory',    next: [] },
  'contract':       { prev: 'requisition',  next: ['certificate'] },
  'certificate':    { prev: 'contract',     next: ['done_contracts'] },
  'done_contracts': { prev: 'certificate',  next: [] },
};

export const DONE_STAGE_IDS = ['done_orders', 'done_contracts'];
