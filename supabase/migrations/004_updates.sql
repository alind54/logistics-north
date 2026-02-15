-- ============================================================
-- Migration: Branching stages + manager permissions
-- ============================================================

-- Add new stages for the branching flow
INSERT INTO public.stages (id, name, color, position) VALUES
  ('contract',       'Contract',          'from-teal-500 to-teal-600',    6),
  ('certificate',    'Certificate',       'from-cyan-500 to-cyan-600',    7),
  ('done_orders',    'Done (Orders)',     'from-gray-600 to-gray-700',    8),
  ('done_contracts', 'Done (Contracts)',  'from-gray-500 to-gray-600',    9);

-- Migrate existing requests in 'done' stage to 'done_orders'
UPDATE public.requests SET stage_id = 'done_orders' WHERE stage_id = 'done';

-- Remove old 'done' stage
DELETE FROM public.stages WHERE id = 'done';

-- Fix positions: shared 0-2, order path 3-5, contract path 6-8
UPDATE public.stages SET position = 0 WHERE id = 'mrf';
UPDATE public.stages SET position = 1 WHERE id = 'supplier';
UPDATE public.stages SET position = 2 WHERE id = 'requisition';
UPDATE public.stages SET position = 3 WHERE id = 'order';
UPDATE public.stages SET position = 4 WHERE id = 'inventory';
UPDATE public.stages SET position = 5 WHERE id = 'done_orders';
UPDATE public.stages SET position = 6 WHERE id = 'contract';
UPDATE public.stages SET position = 7 WHERE id = 'certificate';
UPDATE public.stages SET position = 8 WHERE id = 'done_contracts';
