# Deployment (Vercel)

## Environments
- Development (local)
- Preview (PRs)
- Production

## Required Environment Variables
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SESSION_SECRET=<32+ char random string>
PASSWORD_PEPPER=<random string for password hashing>
SENTRY_DSN=<optional, Sentry error tracking>

# Storage Provider (optional, defaults to "local")
STORAGE_PROVIDER=local|s3|vercel-blob

# S3 storage (required when STORAGE_PROVIDER=s3)
S3_BUCKET=<bucket name>
S3_REGION=<region, e.g. us-east-1>
S3_ACCESS_KEY_ID=<IAM access key>
S3_SECRET_ACCESS_KEY=<IAM secret key>
S3_ENDPOINT=<optional, custom S3-compatible endpoint>

# Vercel Blob (required when STORAGE_PROVIDER=vercel-blob)
BLOB_READ_WRITE_TOKEN=<Vercel Blob read-write token>
```

## Steps
1) Provision Postgres (Vercel Postgres or managed provider)
2) Configure env vars on Vercel dashboard (see above)
3) Run Prisma migrations:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```
4) Seed initial data (admin user + workflow stages):
   ```bash
   pnpm db:seed
   ```
5) Build and deploy:
   ```bash
   pnpm build
   ```
6) Security headers are configured in `next.config.mjs`:
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin
   - Strict-Transport-Security: max-age=63072000
   - Content-Security-Policy: restrictive policy
   - Permissions-Policy: camera/microphone/geolocation denied
7) Smoke test critical flows:
   - Login with seeded admin user
   - Create a request on the Board
   - Move request through stages
   - Upload/download attachment
   - Verify dashboard metrics load
   - Toggle dark mode
   - Check notification bell after stage move
   - Export CSV from dashboard
   - Admin: create user, generate password reset link
   - Admin: drag-and-drop reorder stages
   - Verify SSE real-time updates on Board

## Attachments Storage
- Controlled by `STORAGE_PROVIDER` env var (`local`, `s3`, or `vercel-blob`)
- **local** (default): filesystem `uploads/` directory — suitable for dev
- **s3**: requires `@aws-sdk/client-s3` installed and S3_* env vars set
- **vercel-blob**: requires `@vercel/blob` installed and `BLOB_READ_WRITE_TOKEN` set
- `uploads/` is in `.gitignore` — not committed
- Provider selection is in `apps/web/server/attachments/storage.ts`

## Real-Time Updates (SSE)
- Board uses Server-Sent Events via `/api/events/board`
- In-memory EventBus — works within a single server process
- For multi-instance deployments, replace EventBus with Redis pub/sub

## Notifications
- In-app notification system with polling (30s interval)
- Triggered on stage transitions — notifies request owner
- API: `GET /api/notifications`, `PATCH /api/notifications`, `PATCH /api/notifications/[id]`

## Password Reset
- Admin generates reset token via `POST /api/auth/reset-password` (requires admin role)
- Public reset page at `/reset-password?token=<token>`
- Tokens expire after 24 hours, hashed with SHA-256 in database

## Backups
- Ensure daily backups on Postgres provider
- Test restore procedure quarterly

## Quality Gate Commands
```bash
pnpm lint          # ESLint across all packages
pnpm typecheck     # TypeScript strict mode
pnpm test          # Vitest unit tests
pnpm test:e2e      # Playwright E2E tests (requires running app)
```
