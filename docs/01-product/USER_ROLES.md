# User Roles & Permissions

## Roles (RBAC)
### Admin
- Manage users and roles
- Manage workflow stages, transitions, and tags
- View all requests and audit logs
- Configure security settings (rate limits, password rules)

### Manager
- View all requests
- Create/update requests
- Move requests between allowed stages
- View dashboards and reports
- View audit logs (read-only)

### Operator
- Create/update requests
- Move requests between allowed stages
- Upload attachments (subject to policy)
- View assigned/team requests (scope configurable)

### Viewer
- Read-only access to requests and dashboards

## Permission model
- Implement as a permission matrix in code + enforced server-side.
- No UI-only security: all checks must happen on the server.

## Ownership / assignment (optional for MVP)
- Requests may have `ownerUserId` (assignee) and `createdByUserId`.
- Access policy can be: “Operators see their own + assigned”; Managers/Admin see all.
