---
name: ebm-form
description: Generate a create/edit form or search/filter form using React Hook Form and Zod. Auto-detects fields from prisma/schema.prisma when available. Also generates API routes (POST, PUT, DELETE) for create/edit forms. Reads UI library from ebm.config.json. Use when user invokes /ebm-form or asks to build a form, create page, edit page, or search/filter UI.
---

# /ebm-form

### Step 1 — Ask form type
```
1. Form type:     create/edit | search/filter
2. Feature name:  e.g. "products"
3. Prisma model:  e.g. "Product" (create/edit only)
4. Fields:        auto-detect from prisma/schema.prisma if exists
                  else ask: "name:string, price:number, status:select, active:boolean"
5. For select fields: options list — e.g. "active,inactive,draft"
6. For relation fields: related model + label/value fields
```

### Step 2 — Read config
```
ebm.config.json → uiLib (shadcn | antd | mui | none)
```

### Step 3 — Generate files

**create/edit → 4 files:**
```
src/components/forms/[Feature]Form.tsx
src/lib/schemas/[feature].schema.ts
src/app/api/[feature]/route.ts          (POST)
src/app/api/[feature]/[id]/route.ts     (PUT, DELETE)
```

**search/filter → 2 files:**
```
src/components/forms/[Feature]FilterForm.tsx
src/lib/schemas/[feature].schema.ts
```

See [REFERENCE.md](REFERENCE.md) for field type mapping, templates, and UI lib variants.

## Shared rules
- Always use React Hook Form + zodResolver
- Path alias: `@/*` → `./src/*` always
- Thai UI text: use formal Thai — see `/ebm-thai` glossary
