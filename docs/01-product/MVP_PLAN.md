# MVP Plan
**Date:** 2026-02-05

## MVP goal
Deliver a production-ready v1 that supports multi-user request tracking with configurable stages, attachments, audit logs, and executive-friendly filtering and insights.

## Milestones
### M1 — Foundations (Week 1)
- Next.js app scaffold (TypeScript, App Router)
- UI system (Tailwind + shadcn/ui) with consistent layout
- Auth (email/password) + RBAC
- Postgres + Prisma + migrations
- Baseline security controls (headers, validation, rate limits, logging)

### M2 — Core Requests (Week 2)
- Requests CRUD
- Workflow stages + board view
- Stage move actions (drag/drop + keyboard fallback)
- Stage history tracking (entered/exited timestamps)

### M3 — Attachments + Audit (Week 3)
- Attachment upload/download with safe storage (Vercel Blob)
- Audit log events for all state changes
- Search/filter/sort (server-side)

### M4 — Admin + Polishing (Week 4)
- Admin stage editor (create/reorder/disable stages, manage transitions)
- Tag management
- Executive dashboard widgets (aging requests, overdue, time-in-stage)
- E2E tests for critical flows
- Deployment on Vercel + production DB

## “Definition of Done” for MVP
See `docs/06-claude/DONE_DEFINITION.md`.
