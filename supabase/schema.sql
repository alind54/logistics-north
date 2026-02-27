-- ============================================================
-- Logistics Request Tracker - Full Schema Reference
-- ============================================================
-- This file combines both scripts for convenience.
-- For step-by-step execution, use the separate files:
--   1. supabase/wipe.sql                            (drop everything)
--   2. supabase/migrations/006_complete_schema.sql   (rebuild all)
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- PART A: WIPE (run this first)
-- ████████████████████████████████████████████████████████████

DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.requests; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.todos; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.projects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.project_members; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_project_created ON public.projects;
DROP TRIGGER IF EXISTS set_requests_updated_at ON public.requests;
DROP TRIGGER IF EXISTS set_todos_updated_at ON public.todos;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.auto_add_project_creator() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_project_member(UUID) CASCADE;

DO $$ BEGIN DROP POLICY "attachments_storage_select" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY "attachments_storage_insert" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY "attachments_storage_delete" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- NOTE: Cannot delete storage buckets via SQL. If you need to wipe the
-- storage bucket, do it manually in Supabase Dashboard > Storage.

DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.stages CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS public.app_role CASCADE;


-- ████████████████████████████████████████████████████████████
-- PART B: CREATE (run after wipe + deleting auth users)
-- ████████████████████████████████████████████████████████████

-- Types
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'logistics');

-- Tables
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role app_role NOT NULL DEFAULT 'logistics',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE public.stages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  position INT NOT NULL UNIQUE
);

CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id TEXT NOT NULL REFERENCES public.stages(id),
  description TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  deleted_by UUID NULL REFERENCES public.profiles(id)
);

CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  deleted_by UUID NULL REFERENCES public.profiles(id)
);

CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  project_id UUID NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  changes JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_project_members_user ON public.project_members(user_id);
CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_requests_stage ON public.requests(stage_id);
CREATE INDEX idx_requests_created_by ON public.requests(created_by);
CREATE INDEX idx_requests_project ON public.requests(project_id);
CREATE INDEX idx_requests_project_stage ON public.requests(project_id, stage_id);
CREATE INDEX idx_requests_deleted_at ON public.requests(deleted_at);
CREATE INDEX idx_todos_user_id ON public.todos(user_id);
CREATE INDEX idx_todos_completed ON public.todos(user_id, completed);
CREATE INDEX idx_todos_project ON public.todos(project_id);
CREATE INDEX idx_todos_project_user ON public.todos(project_id, user_id);
CREATE INDEX idx_todos_deleted_at ON public.todos(deleted_at);
CREATE INDEX idx_attachments_request ON public.attachments(request_id);
CREATE INDEX idx_attachments_project ON public.attachments(project_id);
CREATE INDEX idx_audit_logs_project ON public.audit_logs(project_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Seed stages (9 stages with branching paths)
INSERT INTO public.stages (id, name, color, position) VALUES
  ('mrf',            'MRF',               'from-blue-500 to-blue-600',       0),
  ('supplier',       'Supplier Assignment','from-purple-500 to-purple-600',   1),
  ('requisition',    'Requisitions',       'from-amber-500 to-amber-600',    2),
  ('order',          'Order',              'from-orange-500 to-orange-600',   3),
  ('inventory',      'Inventory',          'from-emerald-500 to-emerald-600', 4),
  ('done_orders',    'Done (Orders)',      'from-gray-600 to-gray-700',      5),
  ('contract',       'Contract',           'from-teal-500 to-teal-600',      6),
  ('certificate',    'Certificate',        'from-cyan-500 to-cyan-600',      7),
  ('done_contracts', 'Done (Contracts)',   'from-gray-500 to-gray-600',      8);

-- Trigger functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role := 'logistics';
BEGIN
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL
     AND NEW.raw_user_meta_data->>'role' IN ('admin', 'manager', 'logistics')
  THEN
    _role := (NEW.raw_user_meta_data->>'role')::app_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "stages_select_all"
  ON public.stages FOR SELECT TO authenticated USING (true);

CREATE POLICY "projects_select"
  ON public.projects FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin' OR public.is_project_member(id));
CREATE POLICY "projects_insert"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));
CREATE POLICY "projects_update"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin' OR (public.get_my_role() = 'manager' AND public.is_project_member(id)))
  WITH CHECK (public.get_my_role() = 'admin' OR (public.get_my_role() = 'manager' AND public.is_project_member(id)));
CREATE POLICY "projects_delete"
  ON public.projects FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin' OR (public.get_my_role() = 'manager' AND created_by = auth.uid()));

CREATE POLICY "project_members_select"
  ON public.project_members FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin' OR public.is_project_member(project_id));
CREATE POLICY "project_members_insert"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin' OR (public.get_my_role() = 'manager' AND public.is_project_member(project_id)));
CREATE POLICY "project_members_delete"
  ON public.project_members FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin' OR (public.get_my_role() = 'manager' AND public.is_project_member(project_id)));

CREATE POLICY "requests_select_project"
  ON public.requests FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin' OR public.is_project_member(project_id));
CREATE POLICY "requests_insert_project"
  ON public.requests FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'manager', 'logistics')
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );
CREATE POLICY "requests_update_project"
  ON public.requests FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  WITH CHECK (
    CASE
      WHEN public.get_my_role() = 'admin' THEN true
      WHEN public.get_my_role() IN ('manager', 'logistics') AND public.is_project_member(project_id) THEN true
      ELSE false
    END
  );
CREATE POLICY "requests_delete_project"
  ON public.requests FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'manager')
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );

CREATE POLICY "todos_select_project"
  ON public.todos FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin' OR public.is_project_member(project_id));
CREATE POLICY "todos_insert_project"
  ON public.todos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id)));
CREATE POLICY "todos_update_project"
  ON public.todos FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  WITH CHECK (public.get_my_role() = 'admin' OR public.is_project_member(project_id));
CREATE POLICY "todos_delete_project"
  ON public.todos FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin' OR public.is_project_member(project_id));

CREATE POLICY "attachments_select"
  ON public.attachments FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin' OR public.is_project_member(project_id));
CREATE POLICY "attachments_insert"
  ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id)));
CREATE POLICY "attachments_delete"
  ON public.attachments FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'manager', 'logistics')
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );

CREATE POLICY "audit_logs_select"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "attachments_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'request-attachments');
CREATE POLICY "attachments_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'request-attachments');
CREATE POLICY "attachments_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'request-attachments');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
