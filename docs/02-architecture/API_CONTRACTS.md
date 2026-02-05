# API Contracts (Route Handlers)

All endpoints are server-authenticated. All writes require CSRF protection if cookie-based sessions are used.

## Auth
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/auth/reset-password` — generate token (admin, `user:manage`) or reset password (public with token)
  - Body (generate): `{ email }` — returns `{ token, expiresIn }`
  - Body (reset): `{ token, newPassword }` — returns `{ message }`
- GET `/api/auth/me`

## Requests
- GET `/api/requests?query=&stageId=&tagIds=&priority=&flowType=&dueBefore=&dueAfter=&ownerId=&page=&pageSize=&sortField=&sortDirection=`
  - `query` searches both description and notes (OR match, case-insensitive)
  - `dueBefore` / `dueAfter` support date-range filtering
  - `sortField`: createdAt | updatedAt | dueDate | priority
  - `sortDirection`: asc | desc
- POST `/api/requests`
- GET `/api/requests/:id`
- PATCH `/api/requests/:id`
- POST `/api/requests/:id/move-stage`  { toStageId, reason? }
  - Triggers SSE board event and notification to request owner
- POST `/api/requests/:id/tags`        { tagIds[] }
- GET `/api/requests/:id/audit`

## Board
- GET `/api/board?flowType=ORDER|CONTRACT` — returns stage columns with grouped requests
- GET `/api/stages?flowType=ORDER|CONTRACT` — returns active stages for a flow type
- GET `/api/requests/:id/transitions` — returns available transitions from current stage

## Real-Time Events (SSE)
- GET `/api/events/board` — Server-Sent Events stream for board updates
  - Events: `STAGE_MOVED`, `REQUEST_CREATED`
  - Keepalive every 30 seconds
  - Auto-reconnect with exponential backoff

## Stages/Transitions (Admin - requires `stage:manage` / `transition:manage`)
- GET `/api/admin/stages` — list all stages (including inactive)
- POST `/api/admin/stages` — create stage { name, orderIndex, appliesTo }
- PATCH `/api/admin/stages/:id` — update stage { name?, orderIndex?, isActive?, appliesTo? }
- POST `/api/admin/stages/reorder` — batch reorder { stageIds[] } (supports drag-and-drop)
- GET `/api/admin/transitions` — list all transitions with stage names
- POST `/api/admin/transitions` — create { fromStageId, toStageId, appliesTo }
- PATCH `/api/admin/transitions/:id` — update { isActive?, appliesTo? }

## Tags (Admin - requires `tag:manage`)
- GET `/api/admin/tags` — list all tags
- POST `/api/admin/tags` — create tag { name, color? }
- PATCH `/api/admin/tags/:id` — update tag { name?, color? }
- DELETE `/api/admin/tags/:id` — delete tag (cascades from request_tags)

## Users (Admin - requires `user:manage`)
- GET `/api/admin/users` — list all users
- POST `/api/admin/users` — create user { email, password, role }
- PATCH `/api/admin/users/:id` — change role { role }

## Notifications
- GET `/api/notifications?unreadOnly=true|false` — get notifications for current user
- PATCH `/api/notifications` — mark all notifications as read
- PATCH `/api/notifications/:id` — mark single notification as read

## Export
- GET `/api/export/requests?from=&to=` — export requests as CSV (requires `audit:read`)
  - `from` / `to` optional date filters (ISO date strings)
  - Returns CSV with Content-Disposition header

## Attachments
- GET `/api/requests/:id/attachments` — list attachments for a request (requires `request:read`)
- POST `/api/requests/:id/attachments` — upload via multipart/form-data (requires `attachment:upload`)
  - Field: `file` (max 10MB, allowed MIME types only)
  - Validates file size, MIME type, file name server-side
  - Creates `ATTACHMENT_ADDED` audit event
- GET `/api/attachments/:id/download` — download file with Content-Disposition header (requires `attachment:download`)
- DELETE `/api/attachments/:id` — remove attachment and file from storage (requires `attachment:delete`)
  - Creates `ATTACHMENT_REMOVED` audit event

## Performance Monitoring
- POST `/api/vitals` — receive Web Vitals metrics (CLS, FCP, LCP, TTFB, INP)

## DTO rules
- All inputs validated with Zod on server.
- Responses use stable DTOs from `packages/shared`.
