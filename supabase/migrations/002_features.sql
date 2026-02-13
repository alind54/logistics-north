-- ============================================================
-- Migration: Audit Logs, Attachments, Soft Delete
-- ============================================================

-- =====================
-- PART A: AUDIT LOGS
-- =====================

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  changes JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_project ON public.audit_logs(project_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (public.get_my_role() = 'manager' AND public.is_project_member(project_id))
  );

CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- TRIGGER: Log request changes
CREATE OR REPLACE FUNCTION public.log_request_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
    VALUES ('create', 'request', NEW.id, NEW.project_id, NEW.created_by,
      jsonb_build_object('new', jsonb_build_object(
        'description', NEW.description, 'notes', NEW.notes, 'stage_id', NEW.stage_id
      ))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
      VALUES ('move_stage', 'request', NEW.id, NEW.project_id, auth.uid(),
        jsonb_build_object(
          'old', jsonb_build_object('stage_id', OLD.stage_id),
          'new', jsonb_build_object('stage_id', NEW.stage_id)
        )
      );
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description OR OLD.notes IS DISTINCT FROM NEW.notes THEN
      INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
      VALUES ('update', 'request', NEW.id, NEW.project_id, auth.uid(),
        jsonb_build_object(
          'old', jsonb_build_object('description', OLD.description, 'notes', OLD.notes),
          'new', jsonb_build_object('description', NEW.description, 'notes', NEW.notes)
        )
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
    VALUES ('delete', 'request', OLD.id, OLD.project_id, auth.uid(),
      jsonb_build_object('old', jsonb_build_object(
        'description', OLD.description, 'notes', OLD.notes, 'stage_id', OLD.stage_id
      ))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_requests_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.log_request_changes();

-- TRIGGER: Log todo changes
CREATE OR REPLACE FUNCTION public.log_todo_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
    VALUES ('create', 'todo', NEW.id, NEW.project_id, NEW.user_id,
      jsonb_build_object('new', jsonb_build_object('task', NEW.task, 'notes', NEW.notes))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
    VALUES ('update', 'todo', NEW.id, NEW.project_id, auth.uid(),
      jsonb_build_object(
        'old', jsonb_build_object('task', OLD.task, 'notes', OLD.notes, 'completed', OLD.completed),
        'new', jsonb_build_object('task', NEW.task, 'notes', NEW.notes, 'completed', NEW.completed)
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
    VALUES ('delete', 'todo', OLD.id, OLD.project_id, auth.uid(),
      jsonb_build_object('old', jsonb_build_object('task', OLD.task, 'notes', OLD.notes))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_todos_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.log_todo_changes();

-- TRIGGER: Log project changes
CREATE OR REPLACE FUNCTION public.log_project_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
    VALUES ('create', 'project', NEW.id, NEW.id, NEW.created_by,
      jsonb_build_object('new', jsonb_build_object('name', NEW.name, 'description', NEW.description))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
    VALUES ('update', 'project', NEW.id, NEW.id, auth.uid(),
      jsonb_build_object(
        'old', jsonb_build_object('name', OLD.name, 'description', OLD.description),
        'new', jsonb_build_object('name', NEW.name, 'description', NEW.description)
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
    VALUES ('delete', 'project', OLD.id, OLD.id, auth.uid(),
      jsonb_build_object('old', jsonb_build_object('name', OLD.name, 'description', OLD.description))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_projects_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_project_changes();


-- =====================
-- PART B: ATTACHMENTS
-- =====================

CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_request ON public.attachments(request_id);
CREATE INDEX idx_attachments_project ON public.attachments(project_id);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_select"
  ON public.attachments FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR public.is_project_member(project_id)
  );

CREATE POLICY "attachments_insert"
  ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() = 'admin' OR public.is_project_member(project_id)
  );

CREATE POLICY "attachments_delete"
  ON public.attachments FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'manager')
    AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
  );


-- =====================
-- PART C: SOFT DELETE
-- =====================

ALTER TABLE public.requests
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN deleted_by UUID REFERENCES public.profiles(id) DEFAULT NULL;

ALTER TABLE public.todos
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN deleted_by UUID REFERENCES public.profiles(id) DEFAULT NULL;

CREATE INDEX idx_requests_deleted ON public.requests(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_todos_deleted ON public.todos(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update requests SELECT policy to exclude soft-deleted
DROP POLICY IF EXISTS "requests_select_project" ON public.requests;
CREATE POLICY "requests_select_project"
  ON public.requests FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.get_my_role() = 'admin'
      OR public.is_project_member(project_id)
    )
  );

-- Admin can see soft-deleted requests
CREATE POLICY "requests_select_deleted_admin"
  ON public.requests FOR SELECT TO authenticated
  USING (
    deleted_at IS NOT NULL
    AND public.get_my_role() = 'admin'
  );

-- Update todos SELECT policy to exclude soft-deleted
DROP POLICY IF EXISTS "todos_select_project" ON public.todos;
CREATE POLICY "todos_select_project"
  ON public.todos FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      (user_id = auth.uid() OR public.get_my_role() = 'admin')
      AND (public.get_my_role() = 'admin' OR public.is_project_member(project_id))
    )
  );

-- Admin can see soft-deleted todos
CREATE POLICY "todos_select_deleted_admin"
  ON public.todos FOR SELECT TO authenticated
  USING (
    deleted_at IS NOT NULL
    AND public.get_my_role() = 'admin'
  );


-- =====================
-- PART D: REALTIME
-- =====================
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;
