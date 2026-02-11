-- ============================================================
-- Migration: Multi-Project Support
-- Run this in Supabase SQL Editor AFTER the initial schema.sql
-- ============================================================

-- PART 1: PROJECTS TABLE
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_created_by ON public.projects(created_by);

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- PART 2: PROJECT MEMBERS TABLE
CREATE TABLE public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON public.project_members(user_id);
CREATE INDEX idx_project_members_project ON public.project_members(project_id);

-- PART 3: AUTO-ADD PROJECT CREATOR AS MEMBER
CREATE OR REPLACE FUNCTION public.auto_add_project_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id)
  VALUES (NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_project_creator();

-- PART 4: ADD project_id TO REQUESTS AND TODOS (nullable first)
ALTER TABLE public.requests ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.todos ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- PART 5: CREATE DEFAULT PROJECT AND BACKFILL
-- Only creates the default project if an admin profile exists
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.projects (id, name, description, created_by)
    VALUES ('a0000000-0000-0000-0000-000000000001', 'Default Project', 'Auto-created project for existing data', admin_id);

    -- Add all existing users as members of the default project
    INSERT INTO public.project_members (project_id, user_id)
    SELECT 'a0000000-0000-0000-0000-000000000001'::uuid, id
    FROM public.profiles
    ON CONFLICT DO NOTHING;

    -- Backfill existing requests and todos
    UPDATE public.requests SET project_id = 'a0000000-0000-0000-0000-000000000001' WHERE project_id IS NULL;
    UPDATE public.todos SET project_id = 'a0000000-0000-0000-0000-000000000001' WHERE project_id IS NULL;
  END IF;
END $$;

-- PART 6: ENFORCE NOT NULL
ALTER TABLE public.requests ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE public.todos ALTER COLUMN project_id SET NOT NULL;

-- PART 7: COMPOSITE INDEXES FOR PROJECT-SCOPED QUERIES
CREATE INDEX idx_requests_project ON public.requests(project_id);
CREATE INDEX idx_requests_project_stage ON public.requests(project_id, stage_id);
CREATE INDEX idx_todos_project ON public.todos(project_id);
CREATE INDEX idx_todos_project_user ON public.todos(project_id, user_id);

-- PART 8: HELPER FUNCTION - CHECK PROJECT MEMBERSHIP
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PART 9: RLS FOR PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select"
  ON public.projects FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR public.is_project_member(id)
  );

CREATE POLICY "projects_insert"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

CREATE POLICY "projects_update"
  ON public.projects FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND public.is_project_member(id))
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND public.is_project_member(id))
  );

CREATE POLICY "projects_delete"
  ON public.projects FOR DELETE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND created_by = auth.uid())
  );

-- PART 10: RLS FOR PROJECT MEMBERS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_select"
  ON public.project_members FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR public.is_project_member(project_id)
  );

CREATE POLICY "project_members_insert"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND public.is_project_member(project_id))
  );

CREATE POLICY "project_members_delete"
  ON public.project_members FOR DELETE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND public.is_project_member(project_id))
  );

-- PART 11: REPLACE REQUESTS RLS POLICIES (project-scoped)
DROP POLICY IF EXISTS "requests_select_all" ON public.requests;
DROP POLICY IF EXISTS "requests_insert_admin_manager" ON public.requests;
DROP POLICY IF EXISTS "requests_update_all_roles" ON public.requests;
DROP POLICY IF EXISTS "requests_delete_admin_manager" ON public.requests;

CREATE POLICY "requests_select_project"
  ON public.requests FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR public.is_project_member(project_id)
  );

CREATE POLICY "requests_insert_project"
  ON public.requests FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'manager')
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );

CREATE POLICY "requests_update_project"
  ON public.requests FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR public.is_project_member(project_id)
  )
  WITH CHECK (
    CASE
      WHEN public.get_my_role() = 'admin' THEN true
      WHEN public.get_my_role() = 'manager' AND public.is_project_member(project_id) THEN true
      WHEN public.get_my_role() = 'logistics' AND public.is_project_member(project_id) THEN
        description = (SELECT description FROM public.requests r WHERE r.id = requests.id)
        AND notes = (SELECT notes FROM public.requests r WHERE r.id = requests.id)
        AND created_by = (SELECT created_by FROM public.requests r WHERE r.id = requests.id)
      ELSE false
    END
  );

CREATE POLICY "requests_delete_project"
  ON public.requests FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'manager')
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );

-- PART 12: REPLACE TODOS RLS POLICIES (project-scoped)
DROP POLICY IF EXISTS "todos_select_own_or_admin" ON public.todos;
DROP POLICY IF EXISTS "todos_insert_own" ON public.todos;
DROP POLICY IF EXISTS "todos_update_own" ON public.todos;
DROP POLICY IF EXISTS "todos_delete_own" ON public.todos;

CREATE POLICY "todos_select_project"
  ON public.todos FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() OR public.get_my_role() = 'admin')
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );

CREATE POLICY "todos_insert_project"
  ON public.todos FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );

CREATE POLICY "todos_update_project"
  ON public.todos FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );

CREATE POLICY "todos_delete_project"
  ON public.todos FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );

-- PART 13: ENABLE REALTIME ON NEW TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
