-- ============================================================
-- Migration 008: Project-wide todos with shared visibility
-- ============================================================
-- Makes todos visible/editable/deletable by all project members,
-- not just the creator. INSERT policy unchanged (user_id = auth.uid()).
-- ============================================================

-- SELECT: all project members can see all project todos
DROP POLICY IF EXISTS "todos_select_project" ON public.todos;
CREATE POLICY "todos_select_project"
  ON public.todos FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR public.is_project_member(project_id)
  );

-- UPDATE: all project members can update any project todo
DROP POLICY IF EXISTS "todos_update_project" ON public.todos;
CREATE POLICY "todos_update_project"
  ON public.todos FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR public.is_project_member(project_id)
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR public.is_project_member(project_id)
  );

-- DELETE: all project members can delete any project todo
DROP POLICY IF EXISTS "todos_delete_project" ON public.todos;
CREATE POLICY "todos_delete_project"
  ON public.todos FOR DELETE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR public.is_project_member(project_id)
  );
