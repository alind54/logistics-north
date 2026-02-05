# Security Baseline

## Core principles
- **Server-side authorization for everything.**
- **No secrets in code**. Use env vars and secret manager.
- **Validate all input** (Zod) and sanitize outputs.
- **Least privilege** for DB and storage tokens.
- **Audit everything** that matters.

## Authentication (email/password)
- Store password hashes using **Argon2id** (preferred) or bcrypt with strong cost.
- Enforce password policy: min length (>=12 recommended), common password blocklist.
- Account lockout / rate limiting on login attempts.
- Password reset via emailed token (optional but recommended for exec use).
- Session security:
  - httpOnly, secure cookies
  - SameSite=Lax or Strict
  - Short idle timeout, absolute max lifetime

## Authorization (RBAC)
- Every route handler must check:
  - user authenticated
  - user role permitted for action
  - resource scope (if operators are restricted)

## OWASP protections
- SQL injection: Prisma parameterization only (never string concat raw SQL).
- XSS: escape/sanitize; do not dangerouslySetInnerHTML for user content.
- CSRF: required for cookie-based sessions on mutations.
- SSRF: do not fetch arbitrary URLs from user input.
- File upload safety:
  - max size limits
  - allowed mime types
  - store metadata; scan optional later
  - never execute user files

## Attachment Security (implemented)
- **File size limit**: 10 MB max per file, enforced server-side via `validateFileSize()`
- **MIME type allowlist**: Only approved types accepted (images, PDF, Office docs, CSV, plain text)
  - Validated server-side via `validateMimeType()` before storage
  - Blocked types: executables, HTML, JavaScript, archives, etc.
- **File name sanitization**: Blob keys use `crypto.randomUUID()` prefix; file names stripped of special characters
- **Storage isolation**: Files stored under `uploads/attachments/{requestId}/{uuid}_{sanitized_name}`
  - `uploads/` directory excluded from Git via `.gitignore`
  - Storage layer abstracted for swap to Vercel Blob or S3
- **RBAC enforcement**: All attachment endpoints check permissions server-side:
  - `attachment:upload` — ADMIN, MANAGER, OPERATOR
  - `attachment:download` — ADMIN, MANAGER, OPERATOR, VIEWER
  - `attachment:delete` — ADMIN, MANAGER only
- **Audit trail**: `ATTACHMENT_ADDED` and `ATTACHMENT_REMOVED` events logged with file metadata
- **Response headers**: Downloads served with `Content-Disposition: attachment`, `Cache-Control: private, no-cache`

## Headers & platform
- Strict security headers (CSP, X-Frame-Options, etc.)
- Use HTTPS only in production.
- Use Vercel environment separation: dev/preview/prod.

## Logging
- Log auth events, stage moves, admin changes.
- Never log secrets or raw passwords.
- PII minimization in logs and audit payloads.
