# ebm-skills

Claude Code skills for EBM Next.js projects.

## Install

```bash
npx ebm-skills
```

Install specific skills only:

```bash
npx ebm-skills --only init,auth,table
```

Restart Claude Code after installing.

## Skills

| Command | What it does |
|---------|-------------|
| `/ebm-init` | New project wizard (create-next-app + Tailwind + UI lib + DB) |
| `/ebm-auth` | Full auth system — JWT, RBAC, signin/forgot-password/user management pages |
| `/ebm-table` | Server-side data table with pagination, search, and sort |
| `/ebm-form` | Create/edit or search/filter form with React Hook Form + Zod |
| `/ebm-upload` | Drag & drop file upload (local disk or S3-compatible) |
| `/ebm-thai` | Scan & fix informal Thai UI text using formal Thai glossary |

## Requirements

- [Claude Code](https://claude.ai/download) installed
- Node.js 18+

## Typical workflow

```
/ebm-init     → scaffold new project
/ebm-auth     → add auth system
/ebm-table    → add data tables per feature
/ebm-form     → add create/edit forms per feature
/ebm-upload   → add file upload if needed
/ebm-thai     → fix Thai language formality before review
```
