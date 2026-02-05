# Product Requirements Document (PRD)
**Date:** 2026-02-05

## 1) Purpose
Build a **secure, production-ready** request tracking web app for a company to manage logistics/procurement-style requests through configurable workflow stages, plus a personal/team to-do list. Executives will use it, so it must be reliable, fast, and professional.

## 2) Target users
- **Executives / Managers:** high-level visibility, filters, SLA/duration insights, reporting.
- **Operators / Request Handlers:** day-to-day creation, updates, moving cards through stages.
- **Admins:** manage workflow stages, tags, user roles, and security policies.

## 3) Core objects
### A) Request
Fields:
- Description (required)
- Notes (optional)
- Priority (e.g., Low/Normal/High/Urgent)
- Due date (optional)
- Tags (0..n)
- Attachments (0..n)
- **Stage durations** (derived from stage history events)

### B) Workflow Stage
Admin-editable list of stages. Stages must support two workflow branches:
- **Order path:** `MRF → Supplier Assignment → Requisition → Order → Inventory → Done`
- **Contract path:** `MRF → Supplier Assignment → Requisition → Contract → Certificate → Done`

> Stages are configurable; the above is the default initial config.

### C) User + Roles
Multi-user with **email/password** authentication, with role-based authorization (RBAC).

## 4) Key features
- Kanban board for Requests with drag-and-drop between stages
- Branching workflow (Order vs Contract)
- Stage durations and timestamps (entered/exited time per stage, time-in-stage)
- Attachments (upload, download, view metadata)
- Search / filter / sort across all fields (including tags, priority, due date, stage, owner)
- Audit log (who changed what and when, including stage moves)
- Admin panel: manage users/roles, stages, tags, and allowed transitions
- Responsive UI for desktop/tablet/mobile

## 5) Non-functional requirements
- Security baseline aligned with OWASP recommendations
- No secrets in code; no hardcoded keys; least-privilege access
- SQL injection protection (parameterized queries via ORM)
- Robust validation (server-side + client-side)
- Observability: structured logs, error tracking, performance metrics
- Backups & data durability (Postgres-managed service)
- Accessibility & professional UI (not “vibe-coded”)

## 6) Out of scope (MVP)
- Complex ERP integrations (can be added later)
- Multi-tenant support (single company tenancy assumed)
- Offline-first mode
