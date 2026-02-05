# Repository Structure (Target)

```
.
├─ apps/
│  ├─ web/
│  │  ├─ app/                 # Next.js App Router
│  │  ├─ server/              # domain services (auth, requests, workflow, audit)
│  │  ├─ lib/                 # env, logger, utils
│  │  └─ styles/
├─ packages/
│  ├─ shared/                 # types + Zod DTOs + permission enums
│  └─ ui/                     # reusable shadcn-based components
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ docs/                      # this documentation set
└─ .env.example
```
