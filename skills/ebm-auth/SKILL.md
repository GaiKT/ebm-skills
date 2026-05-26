---
name: ebm-auth
description: Generate a full authentication system for a Next.js project — JWT sessions, RBAC with CASL, brute-force protection, and complete UI pages (signin, forgot-password, reset-password, first-login, user management, user profile). Reads project config from ebm.config.json. Supports Next.js fullstack (NextAuth) and Next.js + FastAPI. Use when user invokes /ebm-auth or asks to add authentication to an existing project.
---

# /ebm-auth

### Step 1 — Read config
```
ebm.config.json exists? → use projectType, uiLib, primaryColor
else → ask questions → save to ebm.config.json
```

### Step 2 — Detect stack
```
Has next-auth → Mode A (Next.js fullstack)
Has FastAPI indicators → Mode B (Next.js + FastAPI)
Unclear → ask
ORM: @prisma/client → Prisma | drizzle-orm → Drizzle | sqlalchemy → SQLAlchemy | else ask
```

### Step 3 — Ask optional modules
- Azure AD SSO?
- Email-based password reset?

### Step 4 — Generate auth logic + UI pages
See [REFERENCE.md](REFERENCE.md) for all files, templates, routes.

### Step 5 — Post-generation rules
- Append to `.env.example` (create if missing)
- `tsconfig.json`: ensure `"@/*": ["./src/*"]` paths exist
- Conflict: file exists → write `filename.auth.ext` + merge comment
- Seed: always `tsx prisma/seed.ts` (Windows-safe, never ts-node)
- Print summary + next steps

## Shared rules
- Path alias: `@/*` → `./src/*` always
- Thai UI text: use formal Thai — see `/ebm-thai` glossary
