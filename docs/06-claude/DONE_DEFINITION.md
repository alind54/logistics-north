# Definition of Done (STRICT)

A feature is “Done” only when:

## Functionality
- Meets PRD requirements
- Works on desktop, tablet, and mobile
- Handles errors gracefully with user-friendly messages

## Security
- RBAC enforced server-side
- Inputs validated (Zod) server-side
- No secrets in repo; envs documented
- Uploads restricted & safe

## Data integrity
- Stage moves update:
  - `requests.currentStageId`
  - close previous `stage_history.exitedAt`
  - create new `stage_history.enteredAt`
  - append audit_event

## Quality
- Unit tests for business rules
- E2E test for the user flow (if applicable)
- Lint/typecheck pass

## Documentation
- Any new endpoint is added to `API_CONTRACTS.md`
- Any new data field is added to `DATA_MODEL.md`
