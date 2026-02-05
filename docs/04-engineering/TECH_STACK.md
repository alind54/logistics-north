# Tech Stack

## Frontend
- Next.js 14.2.5 (App Router)
- TypeScript 5.5 (strict mode)
- TailwindCSS 3.4 with dark mode support (class-based toggle)
- shadcn/ui (Radix-based components via @radix-ui/react-slot)
- class-variance-authority + tailwind-merge for styling utilities
- HTML5 drag-and-drop for admin stage reordering

## Backend/API
- Next.js Route Handlers (Node runtime where needed)
- Zod 3.23 for validation
- iron-session 8.0 for secure cookie-based sessions
- Server-Sent Events (SSE) for real-time board updates

## Authentication & Security
- Argon2id (via argon2 package) for password hashing
- Password pepper stored in environment variable
- httpOnly, secure, sameSite=lax cookies
- Rate limiting on login (5 attempts, 30 min lockout)
- Token-based password reset (SHA-256 hashed, 24h expiry)
- Admin-managed user creation with Argon2id

## Data
- PostgreSQL
- Prisma ORM 5.22 + migrations
- UUID primary keys
- Models: User, Request, Stage, Transition, StageHistory, Tag, RequestTag, Attachment, AuditEvent, PasswordResetToken, Notification

## Attachments
- Multi-provider storage abstraction (`apps/web/server/attachments/storage.ts`)
  - **Local filesystem** (default): `uploads/` directory
  - **AWS S3**: via `@aws-sdk/client-s3` (optional dependency)
  - **Vercel Blob**: via `@vercel/blob` (optional dependency)
- Provider selection via `STORAGE_PROVIDER` env var
- File validation: 10MB max, MIME type allowlist

## Notifications
- In-app notification system with bell icon in header
- Notification types: ASSIGNMENT, OVERDUE, STAGE_CHANGE, SYSTEM
- Auto-polling every 30 seconds
- Mark individual or all-read support

## State/Data fetching
- Server Components for initial data fetch (pages, dashboard)
- Client-side fetch with URL search params for filtering (FilterBar)
- Client-side state management in admin console components
- SSE event bus for real-time board updates

## Observability
- Structured JSON logs with timestamps and correlation IDs
- Audit logging for security events (append-only audit_events table)
- Sentry integration (optional, via SENTRY_DSN env var)
- Web Vitals reporting (CLS, FCP, LCP, TTFB, INP) via `/api/vitals`

## Accessibility
- Skip-to-content link
- ARIA landmarks (navigation, main, region)
- `aria-current="page"` on active nav links
- `aria-expanded` on mobile menu toggle
- `aria-label` on interactive elements (notifications, theme toggle, board columns)
- Keyboard navigable with visible focus indicators

## Export
- CSV export of requests with date-range filtering
- Available to ADMIN and MANAGER roles (`audit:read` permission)

## Testing
- Unit: Vitest 2.0 (125 tests)
- E2E: Playwright 1.45
- Lint: ESLint 8.57 with next/core-web-vitals
- Format: Prettier 3.3 with tailwindcss plugin

## Package Management
- pnpm 9.1 with workspaces
- Monorepo structure:
  - apps/web - Next.js application
  - packages/shared - types, schemas, constants
  - packages/ui - reusable UI components
