# Module Boundaries

## apps/web
- `app/(auth)/...` authentication pages
- `app/(app)/board` kanban board
- `app/(app)/requests` list/detail pages
- `app/(app)/admin` admin console
- `app/api/...` route handlers (server API)
- `server/` domain services:
  - `server/auth/*`
  - `server/requests/*`
  - `server/workflow/*`
  - `server/audit/*`
  - `server/attachments/*`
- `lib/` utilities (logger, env, http, date, etc.)

## packages/shared
- Zod schemas for all input/output DTOs
- Shared TypeScript types
- Permission enums, constants

## packages/ui
- Reusable UI components (buttons, tables, dialogs, kanban card)
- Layout primitives (page shell, sidebar, topbar)
