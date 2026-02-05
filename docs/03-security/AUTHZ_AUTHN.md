# AuthN/AuthZ Implementation Notes

## Recommended approach
- Use a proven auth library (e.g., NextAuth) with a Credentials provider OR a small custom auth module.
- Store users in Postgres.
- Sessions:
  - Either database-backed sessions (recommended for control)
  - Or JWT sessions with strict rotation and short lifetimes

## Role enforcement pattern
- Create `requireRole(minRole)` or permission checks in a single module.
- Every route handler calls it before doing any work.

## Admin-only endpoints
- Stages, transitions, user management
- Must be protected both in UI and server route handlers.

## Operator scoping (configurable)
- Option 1: Operators can see only assigned + created requests
- Option 2: Operators see all (if company wants)
Implement as a policy setting.
