-- ============================================================================
-- 001-roles-and-rls.sql
-- PostgreSQL Role Design & Row Level Security for Logistics North
--
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Requires: superuser / postgres role
--
-- Architecture: All connections come through PgBouncer as the `postgres` user.
-- Per-request role switching is done via SET LOCAL role inside transactions,
-- which is transaction-scoped and PgBouncer transaction-mode safe.
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE ROLES
-- ============================================================================
-- NOLOGIN: these roles are assumed via SET LOCAL role, not direct connections.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_manager') THEN
    CREATE ROLE app_manager NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_logistics') THEN
    CREATE ROLE app_logistics NOLOGIN;
  END IF;
END
$$;

-- Allow the postgres user (PgBouncer connection user) to assume these roles
GRANT app_admin TO postgres;
GRANT app_manager TO postgres;
GRANT app_logistics TO postgres;

-- ============================================================================
-- PART 2: SCHEMA ACCESS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO app_admin, app_manager, app_logistics;

-- ============================================================================
-- PART 3: TABLE-LEVEL GRANTS
-- ============================================================================

-- app_admin: full CRUD on ALL tables + sequences
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_admin;

-- app_manager: read/write on business tables, read-only on users
-- Business tables: requests, request_tags, stage_history, stages, transitions,
--   tags, attachments, notifications, todos, audit_events, password_reset_tokens
GRANT SELECT, INSERT, UPDATE, DELETE ON
  requests, request_tags, stage_history,
  stages, transitions, tags,
  attachments, notifications, todos,
  audit_events
TO app_manager;

GRANT SELECT ON users TO app_manager;
GRANT SELECT ON password_reset_tokens TO app_manager;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_manager;

-- app_logistics: read/write on logistics tables, read-only on reference tables
-- Logistics tables: requests, stage_history, attachments, notifications, todos
GRANT SELECT, INSERT, UPDATE ON
  requests, stage_history, attachments,
  notifications, todos
TO app_logistics;

-- Read-only reference tables
GRANT SELECT ON
  users, stages, transitions, tags,
  request_tags, audit_events, password_reset_tokens
TO app_logistics;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_logistics;

-- ============================================================================
-- PART 4: DEFAULT PRIVILEGES (for future tables created by postgres)
-- ============================================================================

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO app_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO app_manager;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO app_logistics;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO app_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO app_manager;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO app_logistics;

-- ============================================================================
-- PART 5: ENABLE ROW LEVEL SECURITY
-- ============================================================================
-- ENABLE RLS: policies are enforced for non-owner roles
-- FORCE RLS: policies are enforced even when SET ROLE is used from the owner

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests FORCE ROW LEVEL SECURITY;

ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages FORCE ROW LEVEL SECURITY;

ALTER TABLE transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transitions FORCE ROW LEVEL SECURITY;

ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history FORCE ROW LEVEL SECURITY;

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags FORCE ROW LEVEL SECURITY;

ALTER TABLE request_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_tags FORCE ROW LEVEL SECURITY;

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments FORCE ROW LEVEL SECURITY;

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

-- Also handle the Prisma migrations table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_prisma_migrations') THEN
    EXECUTE 'ALTER TABLE _prisma_migrations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE _prisma_migrations FORCE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY admin_prisma_migrations ON _prisma_migrations FOR ALL TO app_admin USING (true) WITH CHECK (true)';
  END IF;
END
$$;

-- ============================================================================
-- PART 6: RLS POLICIES — app_admin (unrestricted access to all tables)
-- ============================================================================

CREATE POLICY admin_users ON users
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_requests ON requests
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_stages ON stages
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_transitions ON transitions
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_stage_history ON stage_history
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_tags ON tags
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_request_tags ON request_tags
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_attachments ON attachments
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_password_reset_tokens ON password_reset_tokens
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_notifications ON notifications
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_todos ON todos
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

CREATE POLICY admin_audit_events ON audit_events
  FOR ALL TO app_admin USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 7: RLS POLICIES — app_manager
-- Full CRUD on business tables, read-only on users
-- ============================================================================

-- users: read-only
CREATE POLICY manager_users_read ON users
  FOR SELECT TO app_manager USING (true);

-- requests: full CRUD
CREATE POLICY manager_requests ON requests
  FOR ALL TO app_manager USING (true) WITH CHECK (true);

-- stages: full CRUD (managers can view stage config)
CREATE POLICY manager_stages ON stages
  FOR ALL TO app_manager USING (true) WITH CHECK (true);

-- transitions: full CRUD
CREATE POLICY manager_transitions ON transitions
  FOR ALL TO app_manager USING (true) WITH CHECK (true);

-- stage_history: full CRUD
CREATE POLICY manager_stage_history ON stage_history
  FOR ALL TO app_manager USING (true) WITH CHECK (true);

-- tags: full CRUD
CREATE POLICY manager_tags ON tags
  FOR ALL TO app_manager USING (true) WITH CHECK (true);

-- request_tags: full CRUD
CREATE POLICY manager_request_tags ON request_tags
  FOR ALL TO app_manager USING (true) WITH CHECK (true);

-- attachments: full CRUD
CREATE POLICY manager_attachments ON attachments
  FOR ALL TO app_manager USING (true) WITH CHECK (true);

-- password_reset_tokens: read-only
CREATE POLICY manager_password_reset_tokens ON password_reset_tokens
  FOR SELECT TO app_manager USING (true);

-- notifications: full CRUD
CREATE POLICY manager_notifications ON notifications
  FOR ALL TO app_manager USING (true) WITH CHECK (true);

-- todos: full CRUD
CREATE POLICY manager_todos ON todos
  FOR ALL TO app_manager USING (true) WITH CHECK (true);

-- audit_events: full CRUD (managers can create + read audit events)
CREATE POLICY manager_audit_events ON audit_events
  FOR ALL TO app_manager USING (true) WITH CHECK (true);

-- ============================================================================
-- PART 8: RLS POLICIES — app_logistics
-- Read/write on logistics tables, read-only on reference tables
-- No DELETE on requests (logistics cannot delete requests)
-- ============================================================================

-- users: read-only
CREATE POLICY logistics_users_read ON users
  FOR SELECT TO app_logistics USING (true);

-- requests: SELECT + INSERT + UPDATE (no DELETE)
CREATE POLICY logistics_requests_select ON requests
  FOR SELECT TO app_logistics USING (true);

CREATE POLICY logistics_requests_insert ON requests
  FOR INSERT TO app_logistics WITH CHECK (true);

CREATE POLICY logistics_requests_update ON requests
  FOR UPDATE TO app_logistics USING (true) WITH CHECK (true);

-- stages: read-only
CREATE POLICY logistics_stages_read ON stages
  FOR SELECT TO app_logistics USING (true);

-- transitions: read-only
CREATE POLICY logistics_transitions_read ON transitions
  FOR SELECT TO app_logistics USING (true);

-- stage_history: SELECT + INSERT + UPDATE (no DELETE)
CREATE POLICY logistics_stage_history_select ON stage_history
  FOR SELECT TO app_logistics USING (true);

CREATE POLICY logistics_stage_history_insert ON stage_history
  FOR INSERT TO app_logistics WITH CHECK (true);

CREATE POLICY logistics_stage_history_update ON stage_history
  FOR UPDATE TO app_logistics USING (true) WITH CHECK (true);

-- tags: read-only
CREATE POLICY logistics_tags_read ON tags
  FOR SELECT TO app_logistics USING (true);

-- request_tags: read-only
CREATE POLICY logistics_request_tags_read ON request_tags
  FOR SELECT TO app_logistics USING (true);

-- attachments: SELECT + INSERT + UPDATE (no DELETE)
CREATE POLICY logistics_attachments_select ON attachments
  FOR SELECT TO app_logistics USING (true);

CREATE POLICY logistics_attachments_insert ON attachments
  FOR INSERT TO app_logistics WITH CHECK (true);

CREATE POLICY logistics_attachments_update ON attachments
  FOR UPDATE TO app_logistics USING (true) WITH CHECK (true);

-- password_reset_tokens: read-only
CREATE POLICY logistics_password_reset_tokens_read ON password_reset_tokens
  FOR SELECT TO app_logistics USING (true);

-- notifications: SELECT + INSERT + UPDATE (can read and mark as read)
CREATE POLICY logistics_notifications_select ON notifications
  FOR SELECT TO app_logistics USING (true);

CREATE POLICY logistics_notifications_insert ON notifications
  FOR INSERT TO app_logistics WITH CHECK (true);

CREATE POLICY logistics_notifications_update ON notifications
  FOR UPDATE TO app_logistics USING (true) WITH CHECK (true);

-- todos: SELECT + INSERT + UPDATE (personal task management, no delete)
CREATE POLICY logistics_todos_select ON todos
  FOR SELECT TO app_logistics USING (true);

CREATE POLICY logistics_todos_insert ON todos
  FOR INSERT TO app_logistics WITH CHECK (true);

CREATE POLICY logistics_todos_update ON todos
  FOR UPDATE TO app_logistics USING (true) WITH CHECK (true);

-- audit_events: read-only
CREATE POLICY logistics_audit_events_read ON audit_events
  FOR SELECT TO app_logistics USING (true);

-- ============================================================================
-- PART 9: RECOMMENDED INDEXES (performance)
-- ============================================================================

-- Trigram index for ILIKE substring search on request description
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_requests_description_trgm
  ON requests USING gin (description gin_trgm_ops);

-- Filtered index for overdue queries (only rows with a due date)
CREATE INDEX IF NOT EXISTS idx_requests_overdue
  ON requests ("dueDate")
  WHERE "dueDate" IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES (run these after applying the script)
-- ============================================================================
-- Check roles:      SELECT rolname FROM pg_roles WHERE rolname LIKE 'app_%';
-- Check grants:     SELECT * FROM information_schema.role_table_grants WHERE grantee LIKE 'app_%';
-- Check RLS:        SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- Check policies:   SELECT tablename, policyname, roles FROM pg_policies WHERE schemaname = 'public';
