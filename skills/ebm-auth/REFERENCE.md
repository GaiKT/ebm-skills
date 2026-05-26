# ebm-auth Reference

## Config detection

Read `ebm.config.json` before generating anything:
```json
{
  "projectType": "landing | backoffice | both",
  "colorMode": "dark | light | system",
  "primaryColor": "#3b82f6",
  "uiLib": "shadcn | antd | mui | none"
}
```
If file missing → ask questions → save to `ebm.config.json`.

UI generation rules:
- **shadcn/ui**: use `<Button>`, `<Input>`, `<Card>` components
- **Ant Design**: use `<Form>`, `<Input>`, `<Button>`, `<Table>` components
- **MUI**: use `<TextField>`, `<Button>`, `<DataGrid>` components
- **none / fallback**: generate raw Tailwind (dark slate theme)

---

## Mode A — Next.js App Router (Fullstack)

### Auth logic files

| File | Purpose |
|------|---------|
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth handler |
| `src/app/api/auth/[...nextauth]/auth-options.ts` | JWT config, providers, callbacks |
| `src/middleware.ts` | Route protection, first-login redirect |
| `src/lib/auth.ts` | hashPassword, comparePasswords, findUserByEmail |
| `src/lib/authorisation.ts` | CASL buildAbilityFor |
| `src/lib/permission.ts` | getDataPermission (DB query) |
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/services/AuthProvider.tsx` | SessionProvider client wrapper |
| `src/services/AbilityProvider.tsx` | CASL ability context, syncs on session change |
| `src/store/useAbilityStore.ts` | Zustand store for abilities |
| `types/next-auth.d.ts` | Extended Session/JWT types |

### auth-options.ts key config
```typescript
// JWT strategy, 30-day session
// Credentials provider: email + password
// Brute force: 5 attempts → 1-minute block (in-memory Map)
// Session callback: embed id, email, name, phone_number,
//   department_id, operation_hash[], reset_password, ad flags
```

### types/next-auth.d.ts
```typescript
declare module 'next-auth' {
  interface Session {
    user: {
      id: number; email: string; name: string
      phone_number: string; department_id: number
      operation_hash: string[]; reset_password: boolean; ad: boolean
    }
  }
}
```

### middleware.ts
```typescript
// withAuth — public routes: /signin, /forgot-password, /reset-password
// reset_password === false → redirect to /change-password-first
// no token → redirect to /signin
```

---

## UI Pages

### Route mapping by project type

| Page | backoffice route | landing route |
|------|-----------------|---------------|
| Sign in | `/signin` | `/signin` |
| Forgot password | `/forgot-password` | `/forgot-password` |
| Reset password | `/reset-password` | `/reset-password` |
| First login | `/change-password-first` | `/change-password-first` |
| User management | `/dashboard/users` | `/users` |
| User profile (own) | `/dashboard/profile` | `/profile` |
| User detail (admin) | `/dashboard/users/[id]` | `/users/[id]` |

### Sign-in page
- Email + password form
- Error states: invalid credentials, TOO_MANY_ATTEMPTS
- Link to forgot password
- Calls `signIn('credentials', { email, password, redirect: false })`

### Forgot password page
- Email input form
- Calls `POST /api/auth/resetpassword/request`
- Show success message after submit

### Reset password page  
- New password + confirm password fields
- Reads `token` from URL query params
- Calls `POST /api/auth/resetpassword/confirm`

### First login page (`/change-password-first`)
- New password + confirm password
- Calls `PUT /api/change-password-first`
- Updates session `reset_password: true` on success
- Redirects to `/dashboard` or `/` based on project type

### User management (`/dashboard/users` or `/users`)

**List page:**
- Table: name, email, role, department, status
- Search/filter by name or email
- Actions: edit, delete, reset password
- "Add user" button → create modal/page

**Create/Edit page (`/users/new`, `/users/[id]/edit`):**
- Fields: name, email, password (create only), phone_number
- Role selector (dropdown from DB)
- Department selector (dropdown from DB)
- reset_password toggle

```typescript
// API routes needed
// GET    /api/users              → list users with role + department
// POST   /api/users              → create user
// GET    /api/users/[id]         → get single user
// PUT    /api/users/[id]         → update user
// DELETE /api/users/[id]         → delete user
// PUT    /api/users/[id]/reset-password → force password reset
```

### User profile — own (`/dashboard/profile` or `/profile`)
- Display: name, email, phone_number, role, department
- Edit: name, phone_number
- Change password section: current → new → confirm
- Calls `PUT /api/auth/passwordsetting`

### User detail — admin (`/dashboard/users/[id]` or `/users/[id]`)
- Display all user fields: name, email, phone, role, department
- Permissions list: all operation_hash entries as badges
- Edit button → goes to edit page
- Reset password button → calls reset-password API

---

## Seed file (always generate)

`prisma/seed.ts` with `tsx` runner:
```typescript
// Operations: USER/ROLE/DATA/REPORT/SETTING/DEPARTMENT/FILE × VIEW/ADD/EDIT/DELETE/DOWNLOAD/UPLOAD/OPERATE/RESET_PASSWORD
// Role: primaryAdmin → all operations
// Department: Administration
// User: admin@example.com / Admin@1234, reset_password: true
```

Add to `package.json`:
```json
{
  "scripts": { "seed": "tsx prisma/seed.ts" },
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```
devDependencies: `tsx` (NOT ts-node — breaks on Windows)

---

## Optional: Azure AD

```typescript
import AzureADProvider from 'next-auth/providers/azure-ad'
// First AD login: create user in DB with default role/department
// Set ad: true flag in session
```
Env vars: `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`

---

## Optional: Email Password Reset

Files:
- `src/app/api/auth/resetpassword/request/route.ts` — 32-byte token, 15min expiry, send email
- `src/app/api/auth/resetpassword/confirm/route.ts` — validate token, hash password, delete token

Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

---

## Mode B — Next.js (FE) + FastAPI (BE)

### FastAPI files

| File | Purpose |
|------|---------|
| `auth/router.py` | `/auth/login`, `/auth/logout`, `/auth/refresh` |
| `auth/dependencies.py` | `get_current_user` dependency |
| `auth/utils.py` | hash_password, verify_password, create_access_token |
| `auth/models.py` | User, Role, Permission, Department models |
| `auth/permissions.py` | casbin enforcer, buildAbilityFor |
| `auth/schemas.py` | LoginRequest, TokenResponse, UserOut |

### Next.js files (Mode B)

| File | Purpose |
|------|---------|
| `src/app/signin/page.tsx` + `sign-in-form.tsx` | Sign-in UI |
| `src/lib/auth-client.ts` | API calls to FastAPI, httpOnly cookie storage |
| `src/middleware.ts` | Redirect to /signin if no token |

UI pages for Mode B follow the same route mapping above but call FastAPI endpoints instead of NextAuth.

### auth/utils.py
```python
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta=None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
```

---

## RBAC Reference

### Permission format: `SUBJECT__ACTION`
Subjects: `USER ROLE DATA REPORT SETTING DEPARTMENT FILE`
Actions: `VIEW ADD EDIT DELETE DOWNLOAD UPLOAD OPERATE RESET_PASSWORD`

### DB Schema
```sql
users        (id, email, password_hash, name, phone_number, department_id, role_id, reset_password, ad, created_at)
roles        (id, name)
operations   (id, name)  -- e.g. "DATA__VIEW"
role_operations      (role_id, operation_id)
departments          (id, name)
department_operations (department_id, operation_id)
```

---

## .env.example additions

### Mode A
```env
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
# Azure AD (optional)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
# Email Reset (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### Mode B
```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
SECRET_KEY=your-secret-here
ACCESS_TOKEN_EXPIRE_MINUTES=43200
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Post-generation summary template
```
✓ Generated [N] auth logic files
✓ Generated [N] UI pages
⚠ [N] conflicts → written as *.auth.* (merge manually)
📋 Env vars appended to .env.example

Default credentials:
  Email:    admin@example.com
  Password: Admin@1234

Next steps:
1. npm install next-auth bcryptjs @casl/ability zustand
2. npm install -D @types/bcryptjs tsx
3. Copy .env.example → .env.local and fill in values
4. npx prisma migrate dev --name init
5. npx prisma db seed
6. npm run dev
```
