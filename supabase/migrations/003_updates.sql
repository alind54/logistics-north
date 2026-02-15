-- ============================================================
-- Migration: Urgent flag + audit trigger update
-- ============================================================

-- Add is_urgent column to requests
ALTER TABLE public.requests
  ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT false;

-- Update the audit trigger to include is_urgent in logged changes
CREATE OR REPLACE FUNCTION public.log_request_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
    VALUES ('create', 'request', NEW.id, NEW.project_id, NEW.created_by,
      jsonb_build_object('new', jsonb_build_object(
        'description', NEW.description, 'notes', NEW.notes, 'stage_id', NEW.stage_id, 'is_urgent', NEW.is_urgent
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
    IF OLD.description IS DISTINCT FROM NEW.description OR OLD.notes IS DISTINCT FROM NEW.notes OR OLD.is_urgent IS DISTINCT FROM NEW.is_urgent THEN
      INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
      VALUES ('update', 'request', NEW.id, NEW.project_id, auth.uid(),
        jsonb_build_object(
          'old', jsonb_build_object('description', OLD.description, 'notes', OLD.notes, 'is_urgent', OLD.is_urgent),
          'new', jsonb_build_object('description', NEW.description, 'notes', NEW.notes, 'is_urgent', NEW.is_urgent)
        )
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, project_id, user_id, changes)
    VALUES ('delete', 'request', OLD.id, OLD.project_id, auth.uid(),
      jsonb_build_object('old', jsonb_build_object(
        'description', OLD.description, 'notes', OLD.notes, 'stage_id', OLD.stage_id, 'is_urgent', OLD.is_urgent
      ))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
