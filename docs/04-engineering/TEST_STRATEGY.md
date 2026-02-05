# Test Strategy

## Critical E2E flows (Playwright)
1) Login / logout
2) Create request
3) Move request across stages (both ORDER and CONTRACT paths)
4) Upload attachment
5) Admin edits stages and transitions
6) Search and filter results
7) Audit log shows expected events

## Unit tests (Vitest)
- Permission matrix checks
- Workflow transition validation
- Duration calculation helpers
- Input validation schemas

## Quality gates
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e` (required for release)
