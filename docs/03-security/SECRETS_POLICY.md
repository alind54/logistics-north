# Secrets Policy

## Rules
- Never commit secrets to git.
- `.env` is local only; production uses Vercel env vars.
- Use `.env.example` as documentation only.

## Required secrets
- AUTH_SECRET: long random
- PASSWORD_PEPPER: long random (optional but recommended)

## Storage tokens
- Vercel Blob token stored in env
- Restrict token scope where possible

## CI checks
- Add secret scanning (GitHub secret scanning / gitleaks)
- Block merges if secrets detected
