# Threat Model (Lightweight)

## Assets
- Requests data (business-sensitive)
- User accounts & roles
- Attachments (may contain contracts, invoices, etc.)
- Audit log integrity

## Main threats
1) Account takeover (weak passwords, brute force)
2) Privilege escalation (broken RBAC)
3) Data leakage (improper access checks, logs, backups)
4) Injection (SQL/NoSQL, XSS)
5) Malicious file uploads (payloads, oversized files)
6) Misconfiguration (public env secrets, exposed DB)

## Mitigations
- Strong hashing + rate limiting + lockout
- Centralized authz checks and permission tests
- Parameterized ORM queries
- Input validation + safe rendering
- Upload restrictions + signed URLs
- Secrets policy + automated checks (CI)
