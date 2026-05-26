# ebm-init Reference

## Post-CLI scaffolding by project type

After `create-next-app` runs, scaffold additional files based on project type.

---

## Type: landing (หน้าบ้านแสดงข้อมูล)

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout, imports globals.css |
| `src/app/page.tsx` | Hero/landing page |
| `src/app/(pages)/layout.tsx` | Content route group layout |
| `src/components/ui/Navbar.tsx` | Sticky nav: logo + links |
| `src/components/ui/Footer.tsx` | Footer with copyright |

```tsx
// src/components/ui/Navbar.tsx
'use client'
import Link from 'next/link'
export function Navbar() {
  return (
    <nav className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/60 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-16">
        <Link href="/" className="text-xl font-bold text-white">Logo</Link>
        <div className="flex gap-6 text-sm text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
        </div>
      </div>
    </nav>
  )
}
```

---

## Type: backoffice (Dashboard)

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/layout.tsx` | Sidebar + Header + children |
| `src/app/(dashboard)/dashboard/page.tsx` | Overview with stat cards |
| `src/components/layout/Sidebar.tsx` | Left nav with active state |
| `src/components/layout/Header.tsx` | Top bar: page title + user avatar |

```tsx
// src/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

```tsx
// src/components/layout/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/users', label: 'Users' },
  { href: '/dashboard/settings', label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-64 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-slate-700">
        <span className="text-xl font-bold text-white">Admin</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href}
            className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

---

## Type: both (landing + backoffice)

Root `src/app/layout.tsx` = minimal shell only (no nav/sidebar).

Route groups:
- `src/app/(public)/` — landing files (Type A layout pattern)
- `src/app/(dashboard)/` — admin files (Type B layout pattern)

```tsx
// src/app/layout.tsx (Type C root — minimal)
import './globals.css'
export const metadata = { title: 'App', description: '' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-white antialiased">{children}</body>
    </html>
  )
}
```

---

## Tailwind v4 setup (if tailwind: true)

```css
/* src/app/globals.css */
@import "tailwindcss";

/* Primary color override — use ebm.config.json primaryColor */
@theme {
  --color-primary: #3b82f6; /* replace with user's chosen color */
}
```

```js
// postcss.config.mjs
const config = { plugins: { '@tailwindcss/postcss': {} } }
export default config
```

Install: `tailwindcss @tailwindcss/postcss`

**Dark mode:** add `class="dark"` to `<html>` and use `dark:` variants
**Light mode:** default (no extra config needed)
**System mode:** toggle via JS `document.documentElement.classList`

---

## UI Library setup

### shadcn/ui
```bash
npx shadcn@latest init
# Answer prompts: style=default, baseColor=slate, cssVariables=yes
```
Then install components as needed: `npx shadcn@latest add button input card`

### Ant Design
```bash
npm install antd @ant-design/icons
```
```tsx
// src/app/layout.tsx — wrap with AntdRegistry for SSR
import { AntdRegistry } from '@ant-design/nextjs-registry'
// ...
<AntdRegistry>{children}</AntdRegistry>
```
Install: `npm install @ant-design/nextjs-registry`

### MUI (Material UI)
```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```
```tsx
// src/app/layout.tsx — wrap with AppRouterCacheProvider
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
// ...
<AppRouterCacheProvider>{children}</AppRouterCacheProvider>
```
Install: `npm install @mui/material-nextjs`

---

## Database setup

### Prisma
```bash
npm install @prisma/client
npm install -D prisma
npx prisma init --datasource-provider [postgresql|mysql|sqlite]
```

### Drizzle
```bash
npm install drizzle-orm
npm install -D drizzle-kit
# PostgreSQL:  npm install pg @types/pg
# MySQL:       npm install mysql2
# SQLite:      npm install better-sqlite3 @types/better-sqlite3
```
Create `drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql', // or mysql, sqlite
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

---

## tsconfig.json (generate if missing or missing paths)
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

## Post-generation summary template
```
✓ Project initialized with create-next-app
✓ Generated [N] scaffold files
✓ Saved config to ebm.config.json

Stack:
  Type:     [projectType]
  Tailwind: [yes/no] — [colorMode], primary: [color]
  UI lib:   [uiLib]
  DB:       [orm] + [dbProvider]

Next steps:
1. npm install (or yarn/pnpm install)
2. Copy .env.example → .env.local
3. [if DB] npx prisma migrate dev --name init
4. npm run dev

[if backoffice or both]
→ Run /ebm-auth to add authentication
```
