---
name: ebm-table
description: Generate a server-side paginated data table with search, sort, and URL-based state. Creates a table component, API route with GET + pagination, and Zod schema. Reads UI library and project type from ebm.config.json. Use when user invokes /ebm-table or asks to build a data table, list page, or admin table.
---

# /ebm-table

### Step 1 — Ask (in order)
```
1. Feature name   — e.g. "users"
2. Prisma model   — e.g. "User"
3. Columns        — e.g. "name:string, email:string, role:enum, createdAt:date"
4. Optional:      column filters? bulk actions? export CSV? expandable rows?
```

### Step 2 — Read config
```
ebm.config.json → uiLib, projectType
backoffice → src/app/(dashboard)/[feature]/page.tsx
landing    → src/app/[feature]/page.tsx
both       → ask which section
```

### Step 3 — Generate 4 files
```
src/app/(dashboard)/[feature]/page.tsx
src/components/tables/[Feature]Table.tsx
src/app/api/[feature]/route.ts
src/lib/schemas/[feature].schema.ts
```

See [REFERENCE.md](REFERENCE.md) for templates and UI lib variants.

## Shared rules
- URL query params for state: `?page=1&pageSize=10&search=&sortBy=&sortOrder=`
- Path alias: `@/*` → `./src/*` always
- Thai UI text: use formal Thai — see `/ebm-thai` glossary
