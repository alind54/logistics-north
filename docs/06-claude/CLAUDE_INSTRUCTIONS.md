# Claude Code Instructions (STRICT)

## Non-negotiable rules
1) **Assume context is lost.** Before coding, re-read:
   - `docs/02-architecture/ARCHITECTURE.md`
   - `docs/04-engineering/TECH_STACK.md`
   - `docs/03-security/SECURITY_BASELINE.md`
   - `docs/02-architecture/DATA_MODEL.md`
   - `docs/02-architecture/API_CONTRACTS.md`
   - `docs/06-claude/DONE_DEFINITION.md`

2) **No security shortcuts.**
   - No hardcoded secrets.
   - No raw SQL string concatenation.
   - Validate inputs with Zod on server.
   - Enforce RBAC server-side on every endpoint.

3) **Professional UI only.**
   - Use shadcn/ui patterns.
   - Responsive for desktop/tablet/mobile.
   - Avoid “vibe-coded” UI (no random gradients, inconsistent spacing, gimmicks).

4) **Modular architecture.**
   - Keep domain logic in `apps/web/server/*`
   - Keep shared types/schemas in `packages/shared`
   - UI components in `packages/ui`

5) **Write tests.**
   - Add unit tests for workflow + permissions.
   - Add Playwright E2E for critical flows.

## Workflow
- For each task:
  1) Update docs if needed (PRD/MVP/Architecture/API/Security)
  2) Implement code with small, reviewable changes
  3) Add tests + run quality gates
  4) Document decisions in `docs/02-architecture/ARCHITECTURE.md` (or an ADR if needed)

## If any requirement is ambiguous
- Propose a default in the relevant docs file and proceed.
- Do not stall waiting for user input unless the decision is truly blocking.
