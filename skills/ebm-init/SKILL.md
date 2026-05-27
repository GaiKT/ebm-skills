---
name: ebm-init
description: Initialize a new Next.js EBM project. Runs create-next-app then configures Tailwind v4, color mode, UI library (shadcn/ui, Ant Design, MUI, or none), and database (Prisma or Drizzle with PostgreSQL/MySQL/SQLite). Saves choices to ebm.config.json for other ebm-* skills to read. Use when user invokes /ebm-init, asks to start a new Next.js project, or scaffold a new dashboard.
---

# /ebm-init

### Step 1 — Ask (in order, one at a time)
```
1. Project type:    landing | backoffice | both
2. Package manager: npm | yarn | pnpm
3. Tailwind CSS?    yes → dark/light/system + primary color (#hex or preset)
                    no  → skip
4. UI library?      shadcn/ui | Ant Design | MUI | none
5. Database?        yes → ORM: Prisma | Drizzle
                          provider: PostgreSQL | MySQL | SQLite
                    no  → skip
6. Add auth now?    yes → run /ebm-auth after init
                    no  → skip
```

### Step 2 — Run CLI
```bash
npx create-next-app@latest . --typescript --app --src-dir --no-tailwind --no-eslint
```
Then scaffold additional files per answers. See [REFERENCE.md](REFERENCE.md).

### Step 2.5 — Docker Compose (if DB selected and not SQLite)
Generate `docker-compose.yml` with DB service + named volume.
Print: "Run `docker compose up -d` before `npx prisma migrate dev`"

### Step 3 — Save config
Write answers to `ebm.config.json` in project root.

### Step 4 — Summary + next steps

## Shared rules
- Tailwind v4: `@import "tailwindcss"` + `@tailwindcss/postcss`, no config file
- Path alias: `@/*` → `./src/*` always
- Thai UI text: use formal Thai — see `/ebm-thai` glossary
