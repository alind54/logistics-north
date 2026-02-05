# Architecture

## High-level
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend:** Next.js Route Handlers (server-side API) for MVP
- **DB:** Postgres via Prisma ORM (parameterized queries)
- **Attachments:** Vercel Blob (or S3-compatible later)
- **Auth:** Email/password with secure hashing + sessions (NextAuth or custom, per security baseline)
- **RBAC:** Server-enforced role checks on every mutation/query
- **Audit:** Append-only audit_events table
- **Observability:** structured logging + error tracking (Sentry optional)

## Modules / boundaries
- `apps/web`: UI + server routes (Next.js)
- `packages/shared`: shared types, validation schemas, constants
- `packages/ui`: design system wrappers/components (shadcn-based)

## Key decisions
- Keep all business rules on the server (validation, transitions, RBAC).
- Store workflow stages in DB so admins can edit them.
- Track stage durations via normalized stage history events.

## Deployment
- Vercel for web + serverless routes
- Managed Postgres (Vercel Postgres or equivalent)
- Vercel Blob for attachments (token in env)

## Scalability
- Start as single-tenant.
- If growth requires it: extract `apps/api` (Fastify/Nest) or use Next.js standalone server.
