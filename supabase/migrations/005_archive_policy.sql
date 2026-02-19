-- ============================================================
-- Migration: Allow managers to view archived (soft-deleted) requests
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Drop the admin-only policy for viewing soft-deleted requests
DROP POLICY IF EXISTS "requests_select_deleted_admin" ON public.requests;

-- Create new policy that allows both admins and managers to see soft-deleted requests
CREATE POLICY "requests_select_deleted_admin_manager"
  ON public.requests FOR SELECT TO authenticated
  USING (
    deleted_at IS NOT NULL
    AND (
      public.get_my_role() = 'admin'
      OR (public.get_my_role() = 'manager' AND public.is_project_member(project_id))
    )
  );
