# Deployment & Operations Guide

## Prerequisites
- Node.js 18+ and npm
- A Supabase project (free tier works)
- A Vercel account (free tier works)
- Supabase CLI (for edge function deployment): `npm install -g supabase`

## 1. Supabase Project Setup

### Create Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization, name, password, region
4. Wait for project to provision (~2 minutes)
5. Note down: Project URL and anon key from Settings > API

### Run Database Schema
1. Go to SQL Editor in Supabase Dashboard
2. If starting fresh, paste the contents of `supabase/schema.sql` and run it
3. This creates all tables, types, triggers, RLS policies, and seeds the 9 stages
4. If you need to wipe first (e.g., to reset), run `supabase/wipe.sql` first, then the schema

### Create First Admin User
1. Go to Authentication > Users in Supabase Dashboard
2. Click "Add User" > "Create New User"
3. Enter email, password, and set metadata: `{"full_name": "Admin Name", "role": "admin"}`
4. Click Create
5. The `handle_new_user()` trigger will auto-create the profile with admin role
6. Verify: go to Table Editor > profiles and confirm the user exists with role = 'admin'

### If trigger didn't work (role shows 'logistics'):
Run in SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

## 2. Edge Function Deployment

### Link Supabase CLI
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```
The project ref is in your Supabase URL: `https://YOUR_PROJECT_REF.supabase.co`

### Deploy
```bash
npx supabase functions deploy admin-user-management
```

### Verify
Go to Supabase Dashboard > Edge Functions. You should see `admin-user-management` listed and active.

### Edge Function Environment Variables
These are automatically available in Supabase Edge Functions:
- `SUPABASE_URL` — Your project URL
- `SUPABASE_ANON_KEY` — Anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (for admin operations)

No manual configuration needed.

## 3. Frontend Deployment (Vercel)

### Connect Repository
1. Go to https://vercel.com/dashboard
2. Click "Add New" > "Project"
3. Import from GitHub: select the `logistics-north` repository
4. Framework: Vite
5. Build Command: `npm run build` (auto-detected)
6. Output Directory: `dist` (auto-detected)

### Set Environment Variables
In Vercel project Settings > Environment Variables, add:
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

### Deploy
Click Deploy. Vercel will build and deploy automatically. Future pushes to `main` will auto-deploy.

### Custom Domain (Optional)
Go to Settings > Domains to add your own domain. Vercel handles SSL automatically.

## 4. Local Development

```bash
# Clone the repo
git clone https://github.com/alind54/logistics-north.git
cd logistics-north

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key

# Start dev server
npm run dev
# Opens at http://localhost:5173
```

## 5. Common Operations

### Adding Users
1. Log in as admin
2. Go to Admin page (sidebar)
3. Click "Create User"
4. Fill in email, name, password (min 8 chars), role
5. Click Create — user is immediately available

### Creating a Project
1. Go to Projects page (sidebar)
2. Click "New Project"
3. Enter name and description
4. You (the creator) are automatically added as a member
5. Add other users via the Members icon

### Managing Requests
1. Select a project from the dropdown
2. Click "New Request" to create
3. Drag cards between stages, or use arrows for linear movement
4. At Requisitions stage, drag to either Order or Contract path
5. Archive completed requests from Done stages
6. View archived requests in the Archive tab

### Viewing Audit Logs
1. Go to Audit Logs page (admin only)
2. Filter by project, user, action type, date range
3. Click any row to see detailed change diff

### Corrections (Admin Only)
1. Go to Corrections page
2. Move requests between stages with a reason
3. Edit request descriptions, notes, project assignments
4. Soft-delete or restore items
5. All changes recorded in audit logs

## 6. Troubleshooting

### "Failed to create user: Database error creating new user"
- The `handle_new_user()` auth trigger may have failed
- Check SQL Editor: run `SELECT * FROM profiles ORDER BY created_at DESC LIMIT 5`
- If no profile was created, the trigger has an issue. Re-run `supabase/migrations/006_complete_schema.sql` to recreate triggers

### "Cannot reach edge function"
- Edge function not deployed. Run: `npx supabase functions deploy admin-user-management`
- Check Supabase Dashboard > Edge Functions for deployment status
- Check browser console for CORS errors

### "Admin or manager access required" (403)
- Your profile role in the database is not 'admin' or 'manager'
- Fix: `UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';`

### CORS errors in browser console
- The edge function only accepts requests from `https://logistics-north.vercel.app` and `http://localhost:5173`
- If deploying to a different domain, update `supabase/functions/_shared/cors.ts` with the new origin and redeploy

### Login page shows infinite loading spinner
- Check that `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check browser console for network errors
- Verify Supabase project is active (not paused)

### Requests not syncing in real-time
- Check Supabase Dashboard > Database > Publications
- The `supabase_realtime` publication should include: requests, todos, projects, project_members
- If missing, run: `ALTER PUBLICATION supabase_realtime ADD TABLE requests, todos, projects, project_members;`

### Storage uploads failing
- Check that the `request-attachments` bucket exists in Supabase Dashboard > Storage
- If missing, create it: name `request-attachments`, public = false
- Check storage policies exist (created by schema.sql)

## 7. Architecture Notes

### Build Pipeline
- TypeScript compilation (strict mode) via `tsc -b`
- Vite bundling with code splitting
- Vendor chunks: react, supabase, dnd (separately cached)
- 5 lazy-loaded route chunks: Settings, Admin, Projects, AuditLog, Corrections
- Tailwind CSS purging removes unused styles
- Output in `dist/` folder

### Security Model
- **Client-side**: ProtectedRoute, RoleGate, validation
- **Server-side**: Row Level Security (RLS) on every table, edge function JWT validation
- **Network**: CORS whitelist, security headers via Vercel, HTTPS enforced

### Data Flow
```
User Action -> React Component -> Custom Hook -> Supabase Client -> PostgreSQL
                                                                       |
                                                                  RLS Check
                                                                       |
                                                                Realtime CDC
                                                                       |
                                                            All Connected Clients
```
