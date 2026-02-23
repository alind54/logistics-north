-- ============================================================
-- NUCLEAR WIPE: Drops EVERYTHING from the Supabase database
-- ============================================================
-- STEP 1: Run this SQL in Supabase SQL Editor
-- STEP 2: Go to Authentication > Users and delete ALL users
-- STEP 3: Run 006_complete_schema.sql to rebuild everything
-- ============================================================

-- 1. Remove tables from realtime publication (ignore errors if tables don't exist)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.requests; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.todos; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.projects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.project_members; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_project_created ON public.projects;
DROP TRIGGER IF EXISTS set_requests_updated_at ON public.requests;
DROP TRIGGER IF EXISTS set_todos_updated_at ON public.todos;
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;

-- 3. Drop functions (CASCADE also drops any remaining dependents)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.auto_add_project_creator() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_project_member(UUID) CASCADE;

-- 4. Drop storage policies
DO $$ BEGIN DROP POLICY "attachments_storage_select" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY "attachments_storage_insert" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP POLICY "attachments_storage_delete" ON storage.objects; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. Storage bucket cleanup
-- NOTE: Cannot delete storage buckets/objects via SQL.
-- If needed, manually delete in Supabase Dashboard > Storage.

-- 6. Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.stages CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 7. Drop custom types
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============================================================
-- DONE. Now delete all users in Authentication > Users.
-- Then run supabase/migrations/006_complete_schema.sql
-- ============================================================
