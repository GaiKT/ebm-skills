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

### Make `ebm-mask` the default in every project

Cursor: installed with `alwaysApply: true` automatically.

Claude Code: add this to `~/.claude/CLAUDE.md` so the rules load in every session:

```md
## Data masking (default for every project)
Any code that touches personal data (schemas, API responses, logs, alerts, errors, exports,
OTP/token storage, external services) MUST follow the `ebm-mask` skill rules.
Load the skill before writing such code; full guide in its REFERENCE.md.
```

## Skills

| Command | What it does |
|---------|-------------|
| `/ebm-init` | New project wizard (create-next-app + Tailwind + UI lib + DB) |
| `/ebm-auth` | Full auth system — JWT, RBAC, signin/forgot-password/user management pages |
| `/ebm-table` | Server-side data table with pagination, search, and sort |
| `/ebm-form` | Create/edit or search/filter form with React Hook Form + Zod |
| `/ebm-upload` | Drag & drop file upload (local disk or S3-compatible) |
| `/ebm-thai` | Scan & fix informal Thai UI text using formal Thai glossary |
| `/ebm-mask` | Data masking / PII protection (PDPA) — central mask module (TS + Python), audit data exits. **Always-on practice** |

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
/ebm-mask     → set up mask module + audit PII leaks (rules apply automatically)
```
