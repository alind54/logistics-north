-- ============================================================
-- Migration 007: Grant logistics role create/edit/attach
-- permissions matching the manager role for MRF requests.
-- ============================================================

-- 1. Allow logistics to INSERT requests
DROP POLICY IF EXISTS "requests_insert_project" ON public.requests;
CREATE POLICY "requests_insert_project"
  ON public.requests FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'manager', 'logistics')
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );

-- 2. Allow logistics full UPDATE on requests (not just stage_id)
DROP POLICY IF EXISTS "requests_update_project" ON public.requests;
CREATE POLICY "requests_update_project"
  ON public.requests FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR public.is_project_member(project_id)
  )
  WITH CHECK (
    CASE
      WHEN public.get_my_role() = 'admin' THEN true
      WHEN public.get_my_role() IN ('manager', 'logistics')
        AND public.is_project_member(project_id) THEN true
      ELSE false
    END
  );

-- 3. Allow logistics to DELETE attachments
DROP POLICY IF EXISTS "attachments_delete" ON public.attachments;
CREATE POLICY "attachments_delete"
  ON public.attachments FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'manager', 'logistics')
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );
