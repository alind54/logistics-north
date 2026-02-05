# Coding Standards

## TypeScript
- `strict: true`
- No `any` unless justified with comment
- Use DTOs from `packages/shared`

## API
- Validate every input with Zod.
- Return typed responses with consistent error shape:
  - `{ error: { code, message, requestId? } }`

## Database
- Prisma only; avoid raw SQL unless reviewed.
- No N+1 queries in lists; use `include/select` wisely.

## UI
- Use shadcn components consistently.
- Accessibility: keyboard nav, aria labels, focus states.

## Git hygiene
- Conventional commits preferred
- No big “dump” commits
