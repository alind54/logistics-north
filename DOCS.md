# Logistics Request Tracker — Developer Documentation

> Handover documentation for the Logistics Request Tracker application.
> Last updated: 2026-02-26

---

## Table of Contents

1. [App Overview](#app-overview)
2. [Getting Started](#getting-started)
3. [Environment Variables](#environment-variables)
4. [Project Structure](#project-structure)
5. [User Roles and Permissions](#user-roles-and-permissions)
6. [9-Stage Workflow](#9-stage-workflow)
7. [Key Features](#key-features)
8. [Database Schema](#database-schema)
9. [Edge Function: admin-user-management](#edge-function-admin-user-management)
10. [Authentication Flow](#authentication-flow)
11. [Security](#security)
12. [Future Improvements](#future-improvements)

---

## App Overview

- **Name**: Logistics Request Tracker
- **Stack**: React 19 + TypeScript + Vite 7 + Tailwind CSS 3 + Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **Hosting**: Vercel (SPA)
- **Production URL**: https://logistics-north.vercel.app

The Logistics Request Tracker is a real-time kanban-style application for tracking logistics requests through a branching 9-stage workflow. It supports multiple projects, file attachments, soft deletion with archive, audit logging, and role-based access control. All changes sync instantly across connected clients via Supabase Realtime.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase CLI (optional, only needed for edge function deployment)

### Setup

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd logistics-north
   ```

2. Copy the environment template and fill in your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and provide your Supabase URL and anon key (see [Environment Variables](#environment-variables) below).

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Other Commands

| Command             | Description                          |
|---------------------|--------------------------------------|
| `npm run dev`       | Start local development server       |
| `npm run build`     | Create production build              |
| `npm run preview`   | Preview production build locally     |

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Both values are available from your Supabase project dashboard under **Settings > API**.

The `VITE_` prefix is required by Vite so that the variables are exposed to client-side code.

---

## Project Structure

```
src/
├── pages/           — 7 route pages (Login, Dashboard, Projects, Admin, Settings, AuditLog, Corrections)
├── components/      — 36 reusable components organized by feature
│   ├── auth/        — ProtectedRoute, RoleGate, ErrorBoundary
│   ├── request-tracker/ — KanbanBoard, StageColumn, RequestCard, RequestFormModal,
│   │                      FileUploadZone, AttachmentList
│   ├── dashboard/   — ProjectDashboard, SummaryCards, RequestsByStage,
│   │                  StageDistribution, RecentActivity
│   ├── todo-list/   — TodoList, TodoItem, TodoFormModal
│   ├── admin/       — UserTable, UserFormModal
│   ├── audit/       — AuditLogTable, AuditLogFilters, AuditLogDetailModal
│   ├── corrections/ — RequestsTable, TodosTable, DeletedItemsTable,
│   │                  CorrectionEditModal, CorrectionReasonModal, BulkActionsBar
│   ├── projects/    — ProjectFormModal, MemberManagementModal
│   ├── archive/     — ArchiveView
│   └── profile/     — ProfileMenu
├── hooks/           — 10 custom hooks (useRequests, useTodos, useAttachments,
│                      useAuditLogs, etc.)
├── contexts/        — AuthContext, ProjectContext, ToastContext
├── lib/             — supabase.ts (client), validation.ts, toast.ts (bridge)
├── types.ts         — TypeScript interfaces
├── constants.ts     — Stage definitions and transitions
└── App.tsx          — Root with ErrorBoundary, ToastProvider, lazy routes

supabase/
├── schema.sql       — Complete DB schema (wipe + create)
├── wipe.sql         — Standalone wipe script
├── migrations/006_complete_schema.sql — Fresh migration
└── functions/
    ├── admin-user-management/index.ts — Edge function for user CRUD
    └── _shared/cors.ts               — CORS utilities
```

### Key Files Explained

| File / Directory | Purpose |
|-----------------|---------|
| `src/App.tsx` | Application root. Wraps the app in ErrorBoundary, ToastProvider, and defines all lazy-loaded routes. |
| `src/types.ts` | Central TypeScript interfaces for requests, todos, profiles, projects, stages, attachments, and audit logs. |
| `src/constants.ts` | Stage definitions (names, colors, positions) and allowed stage transitions that enforce the branching workflow. |
| `src/lib/supabase.ts` | Initializes and exports the Supabase client singleton. |
| `src/lib/validation.ts` | Shared validation functions (password complexity, file type/size checks, etc.). |
| `src/lib/toast.ts` | Bridge module that connects toast notifications to hooks and utilities outside of React component trees. |
| `src/contexts/AuthContext` | Provides the current user, profile, and authentication state to the entire app. |
| `src/contexts/ProjectContext` | Tracks the currently selected project and provides project-switching logic. |
| `src/contexts/ToastContext` | Manages the toast notification queue and rendering. |
| `supabase/schema.sql` | The authoritative database schema. Running this will wipe and recreate all tables, triggers, RLS policies, and seed data. |

---

## User Roles and Permissions

There are three roles: **Admin**, **Manager**, and **Logistics**. Roles are stored in the `profiles` table and enforced both in the frontend (via the `RoleGate` component) and in the backend (via RLS policies and edge function checks).

| Capability                          | Admin | Manager | Logistics |
|-------------------------------------|:-----:|:-------:|:---------:|
| View dashboard and requests         | Yes   | Yes     | Yes       |
| Move requests between stages        | Yes   | Yes     | Yes       |
| Create/edit/delete requests         | Yes   | Yes     | No        |
| Create/edit/delete todos            | Yes   | Yes     | Yes (own only) |
| Upload file attachments             | Yes   | Yes     | Yes       |
| Manage projects                     | Yes   | Yes     | No        |
| Manage project members              | Yes   | Yes     | No        |
| Create admin accounts               | Yes   | No      | No        |
| Create manager/logistics accounts   | Yes   | Yes     | No        |
| View audit logs                     | Yes   | No      | No        |
| Admin corrections page              | Yes   | No      | No        |
| Archive/restore requests            | Yes   | Yes     | No        |

### Role Hierarchy

- **Admin** has full access to every feature, including user management, audit logs, and the corrections page.
- **Manager** can manage requests, projects, members, and create non-admin accounts, but cannot access audit logs or corrections.
- **Logistics** can view requests, move cards between stages, manage their own todos, and upload attachments, but cannot create or edit requests.

---

## 9-Stage Workflow

The application uses a branching 9-stage workflow for logistics requests. After the shared initial stages, requests fork into one of two completion paths.

### Visual Diagram

```
MRF --> Supplier Assignment --> Requisitions --+--> Order --> Inventory --> Done (Orders)
                                               |
                                               +--> Contract --> Certificate --> Done (Contracts)
```

### Stage Details

| # | Stage Name          | Description                                  |
|---|---------------------|----------------------------------------------|
| 1 | **MRF**             | Material Request Form — the entry point for all requests. |
| 2 | **Supplier Assignment** | A supplier is assigned to the request.     |
| 3 | **Requisitions**    | Purchase requisition is created. This is the branching point. |
| 4 | **Order**           | Purchase order path (Branch A).              |
| 5 | **Inventory**       | Goods received into inventory.               |
| 6 | **Done (Orders)**   | Order path completion.                       |
| 7 | **Contract**        | Contract path (Branch B).                    |
| 8 | **Certificate**     | Certificate obtained for the contract.       |
| 9 | **Done (Contracts)**| Contract path completion.                    |

### Branching Behavior

At stage 3 (Requisitions), the workflow branches:

- **Order path**: Requisitions --> Order --> Inventory --> Done (Orders)
- **Contract path**: Requisitions --> Contract --> Certificate --> Done (Contracts)

Users choose the path by dragging the kanban card into either the Order column or the Contract column. The allowed transitions are defined in `src/constants.ts` and enforced during drag-and-drop operations.

### Kanban Layout

The kanban board displays the shared stages (MRF, Supplier Assignment, Requisitions) in a horizontal row. Below the shared stages, the board forks into two vertical side-by-side columns:

- **Left column**: Order --> Inventory --> Done (Orders)
- **Right column**: Contract --> Certificate --> Done (Contracts)

---

## Key Features

### Real-Time Sync

All request and todo changes sync instantly across all connected clients via Supabase Realtime, which uses PostgreSQL Change Data Capture (CDC) under the hood.

- Subscriptions are scoped to the currently selected project.
- Subscriptions are properly cleaned up on component unmount to prevent memory leaks and stale listeners.
- When any user creates, updates, moves, or deletes a request or todo, every other user viewing the same project sees the change immediately without refreshing.

### Drag-and-Drop Kanban

Requests are displayed as cards in a kanban board organized by workflow stage.

- Drag-and-drop is powered by `@hello-pangea/dnd`.
- Cards can only be moved to stages allowed by the transition rules in `constants.ts`.
- The layout is split: shared stages render horizontally, and the forked paths render as two vertical columns side by side.
- Urgent requests are visually distinguished on the kanban card.

### File Attachments

Files can be attached to any request.

- **Storage**: Supabase Storage bucket named `request-attachments`.
- **Path structure**: `{projectId}/{requestId}/{uuid}_{filename}`
- **Download**: Via signed URLs with 1-hour expiry.
- **Allowed file types**: PDF, images (PNG, JPG, GIF, WebP), Office documents (DOCX, XLSX, PPTX), plain text, CSV, ZIP.
- **Max file size**: 10 MB per file.
- Upload and download are handled by the `useAttachments` hook and the `FileUploadZone` / `AttachmentList` components.

### Soft Delete and Archive

Requests use soft deletion rather than permanent removal.

- Deleted requests have their `deleted_at` and `deleted_by` fields populated.
- Archived requests appear in the **Archive** tab, which is scoped to the currently selected project.
- The **Admin Corrections** page can restore soft-deleted items.
- Todos also support soft deletion with the same mechanism.

### Audit Logging

All significant actions are recorded in the `audit_logs` table.

- Tracked actions include: corrections, edits, moves between stages, deletions, and restorations.
- Each audit log entry includes a JSON diff of the changes (`changes` JSONB column) and optional reason metadata (`metadata` JSONB column).
- The **Audit Log** page (admin-only) provides filtering by:
  - Project
  - User
  - Action type
  - Entity type (request, todo, etc.)
  - Date range
- Individual log entries can be expanded in a detail modal to view the full change diff.

### Toast Notifications

All error and success messages use a custom toast notification system.

- Toasts appear in the bottom-right corner of the viewport.
- Auto-dismiss after 4 seconds.
- No `alert()` or `confirm()` browser dialogs are used for notifications (note: `window.confirm()` is still used in 8 places for destructive action confirmation -- see [Future Improvements](#future-improvements)).
- The toast system is accessible from both React components (via `ToastContext`) and non-React code (via the bridge in `src/lib/toast.ts`).

---

## Database Schema

The database runs on Supabase PostgreSQL. The authoritative schema is in `supabase/schema.sql`.

### Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| **profiles** | User profiles, linked 1:1 to `auth.users`. | `id` (FK to auth.users), `email`, `full_name`, `role` (admin/manager/logistics) |
| **projects** | Projects that group requests and todos. | `id`, `name`, `description`, `created_by` |
| **project_members** | Many-to-many relationship between projects and users. | `project_id`, `user_id` |
| **stages** | The 9 workflow stages. | `id`, `name`, `color`, `position` |
| **requests** | Logistics requests (the core entity). | `stage_id`, `description`, `notes`, `is_urgent`, `project_id`, `deleted_at`, `deleted_by` |
| **todos** | User task items within a project. | `task`, `notes`, `completed`, `project_id`, `deleted_at`, `deleted_by` |
| **attachments** | File metadata for request attachments. | `request_id`, `file_name`, `file_size`, `mime_type`, `storage_path`, `uploaded_by` |
| **audit_logs** | Immutable log of all tracked changes. | `action`, `entity_type`, `entity_id`, `project_id`, `user_id`, `changes` (JSONB), `metadata` (JSONB) |

### Key Triggers

| Trigger | Function | Description |
|---------|----------|-------------|
| On auth.users INSERT | `handle_new_user()` | Auto-creates a row in `profiles` when a new user signs up. Includes safe role validation to ensure only valid roles are assigned. |
| On projects INSERT | `auto_add_project_creator()` | Automatically adds the project creator as a member of the newly created project. |
| On UPDATE (multiple tables) | `update_updated_at()` | Automatically sets the `updated_at` timestamp on any row modification. Applied to all main tables. |

### Row Level Security (RLS)

All tables have RLS enabled. The key policies are:

| Table | Policy Summary |
|-------|---------------|
| **requests** | SELECT, INSERT, UPDATE, DELETE restricted to members of the request's project. |
| **todos** | SELECT, INSERT, UPDATE, DELETE restricted to members of the todo's project. |
| **profiles** | SELECT allowed for all authenticated users (required for displaying member names in project views and assignments). |
| **projects** | SELECT restricted to members of the project. INSERT allowed for admin/manager roles. |
| **project_members** | SELECT restricted to members of the same project. |
| **attachments** | Access follows the parent request's project membership. |
| **audit_logs** | SELECT restricted to admin role only. INSERT allowed for all authenticated users (so the frontend can log actions). |

---

## Edge Function: admin-user-management

**Endpoint**: `POST /functions/v1/admin-user-management`

This Supabase Edge Function handles all user management operations. It requires the caller to have an **admin** or **manager** role, verified via JWT authentication.

### Request Format

All requests are `POST` with a JSON body containing an `action` field and action-specific payload fields.

### Actions

| Action | Required Payload | Description |
|--------|-----------------|-------------|
| `create-user` | `email`, `password`, `full_name`, `role` | Creates a new auth user and corresponding profile. Managers cannot create admin accounts. |
| `update-user` | `user_id`, and optionally `full_name`, `role`, `email` | Updates the user's profile and/or auth email. Self-role-change is blocked to prevent privilege escalation/de-escalation. |
| `delete-user` | `user_id` | Permanently deletes a user from both auth and profiles. Self-deletion is blocked. |
| `reset-password` | `user_id`, `new_password` | Changes a user's password. Minimum 8 characters required. |
| `list-users` | (none) | Returns all user profiles. |

### Example Request

```bash
curl -X POST \
  'https://your-project-id.supabase.co/functions/v1/admin-user-management' \
  -H 'Authorization: Bearer <jwt-token>' \
  -H 'Content-Type: application/json' \
  -d '{"action": "create-user", "email": "new@example.com", "password": "SecurePass1", "full_name": "New User", "role": "logistics"}'
```

### Error Handling

The function returns appropriate HTTP status codes:
- `200` — Success
- `400` — Invalid request (missing fields, validation failure)
- `401` — Not authenticated
- `403` — Insufficient permissions (e.g., manager trying to create admin)
- `500` — Server error

### CORS

CORS is handled by the shared `_shared/cors.ts` module. Only allowed origins can call the function.

---

## Authentication Flow

1. **Login**: User enters email and password on the `LoginPage`.
2. **Rate limiting**: After 5 failed login attempts, a 60-second lockout is enforced on the client side.
3. **Session**: On successful authentication, Supabase Auth returns a JWT which is stored in the browser session.
4. **Route protection**: The `ProtectedRoute` component checks authentication status before rendering any protected page. Unauthenticated users are redirected to the login page.
5. **Profile creation**: When a new user is created (either via the admin edge function or direct signup), the `handle_new_user()` database trigger automatically creates a corresponding row in the `profiles` table.
6. **Password requirements**: Minimum 8 characters, at least one uppercase letter, at least one lowercase letter, at least one number.

---

## Security

### Frontend Security

| Measure | Implementation |
|---------|---------------|
| **Route protection** | `ProtectedRoute` component guards all authenticated pages, redirecting unauthenticated users to login. |
| **Role-based UI** | `RoleGate` component conditionally renders UI elements based on the current user's role. |
| **Error boundary** | `ErrorBoundary` component wraps the app to prevent blank-page crashes from unhandled errors. |
| **Password validation** | Enforces complexity requirements (8+ chars, uppercase, lowercase, number) on all password inputs. |
| **File upload validation** | Validates file type against an allowlist and enforces the 10 MB size limit before uploading. |
| **Login rate limiting** | Locks the login form for 60 seconds after 5 consecutive failed attempts. |

### Backend Security

| Measure | Implementation |
|---------|---------------|
| **Row Level Security** | RLS policies on all tables ensure users can only access data they are authorized to see. |
| **JWT validation** | The edge function validates the JWT and extracts the caller's role before processing any action. |
| **Self-mutation prevention** | The edge function blocks users from deleting themselves or changing their own role. |
| **CORS** | Edge function CORS is restricted to allowed origins only via the shared `_shared/cors.ts` module. |

### Deployment Security (Vercel)

Security headers are configured in `vercel.json`:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking by disallowing iframe embedding. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information sent with requests. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables access to sensitive browser APIs. |
| `Strict-Transport-Security` | `max-age=31536000` | Enforces HTTPS for one year. |

---

## Future Improvements

### Security Enhancements

- **Storage RLS policies**: Add project-scoped file access policies to the `request-attachments` storage bucket. Currently, storage access is not restricted by RLS, meaning a user with a valid signed URL could theoretically access files from other projects.
- **Profiles visibility**: Restrict the `profiles` table SELECT policy to only allow users to see profiles of people who share at least one project with them, rather than all authenticated users.
- **Audit log immutability**: Move audit logging from client-side INSERTs to server-side database triggers. This would make the audit trail tamper-proof and ensure no actions are missed.
- **Rate limiting on edge functions**: Add server-side rate limiting to the `admin-user-management` edge function to prevent abuse.

### UX Enhancements

- **Custom confirm dialogs**: Replace the 8 remaining `window.confirm()` calls with styled modal dialogs that match the application's design system.
- **Empty states**: Add illustrated empty states for tables, lists, and the kanban board when there is no data to display.
- **Pagination**: Implement cursor-based pagination for large datasets (requests, audit logs, user tables).
- **Search and filter**: Add search functionality to the kanban board, user table, and project list.
- **Dark mode**: Implement dark mode using Tailwind CSS `dark:` variants.

### Performance Enhancements

- **PWA / Service Worker**: Add offline-first caching via a service worker to allow basic functionality without network connectivity.
- **Virtual scrolling**: Implement virtual scrolling for very long lists to reduce DOM node count and improve rendering performance.

### Testing

- **Unit tests**: Set up Vitest with React Testing Library for component and hook unit tests.
- **E2E tests**: Add Playwright end-to-end tests for critical user flows (login, request creation, drag-and-drop, file upload).
- **CI pipeline**: Configure GitHub Actions to run linting, type-checking, tests, and production build on every pull request.
