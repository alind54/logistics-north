# Task Workflow for Claude

## Standard loop
1) Identify task scope and impacted modules
2) Read relevant docs (see CLAUDE_INSTRUCTIONS)
3) Create/Update:
   - Zod schemas (packages/shared)
   - Server service (apps/web/server)
   - API route handler (apps/web/app/api)
   - UI components (packages/ui)
   - Page (apps/web/app)
4) Add tests
5) Run:
   - lint
   - typecheck
   - tests
   - e2e (for major flows)
