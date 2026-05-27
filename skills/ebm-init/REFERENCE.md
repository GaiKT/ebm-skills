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

## Tailwind v4 setup (if tailwind: true, uiLib != 'shadcn')

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

### shadcn/ui — DO NOT run `shadcn init`

**Critical:** `npx shadcn@latest init` will **overwrite** `globals.css` and break the Tailwind v4 + primary-color setup. Instead, generate the four files shadcn needs directly. Users can still run `npx shadcn@latest add button` afterwards because `components.json` will exist.

**Install deps:**
```bash
npm install clsx tailwind-merge tailwindcss @tailwindcss/postcss
```

**1. `src/app/globals.css`** — Tailwind v4 + shadcn CSS vars merged.

Convert `ebm.config.json` → `primaryColor` hex to HSL for `--primary`. Format: `H S% L%` (no `hsl()` wrapper).

Common conversions: `#3b82f6` → `217 91% 60%` · `#ef4444` → `0 84% 60%` · `#10b981` → `160 84% 39%` · `#8b5cf6` → `262 83% 58%` · `#f59e0b` → `38 92% 50%`

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: <H> <S>% <L>%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --radius: var(--radius);
}
```

**2. `components.json`** at project root:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**3. `src/lib/utils.ts`:**
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Ant Design
```bash
npm install antd @ant-design/icons @ant-design/nextjs-registry
```
```tsx
// src/app/layout.tsx — wrap with AntdRegistry for SSR
import { AntdRegistry } from '@ant-design/nextjs-registry'
// ...
<AntdRegistry>{children}</AntdRegistry>
```

### MUI (Material UI)
```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/material-nextjs
```
```tsx
// src/app/layout.tsx — wrap with AppRouterCacheProvider
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
// ...
<AppRouterCacheProvider>{children}</AppRouterCacheProvider>
```

---

## Database setup

### Prisma (v7+)
```bash
npm install @prisma/client
npm install -D prisma
npx prisma init --datasource-provider [postgresql|mysql|sqlite]
```

**Required: `prisma.config.ts` at project root** — Prisma v7 reads config from this file:
```ts
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
})
```

Do **not** add a `"prisma"` key to `package.json` — it is deprecated in v7.

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

## Docker Compose (if database selected, not SQLite)

Generate `docker-compose.yml` at project root so the DB runs locally without manual setup.

### PostgreSQL
```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### MySQL
```yaml
services:
  db:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: app
      MYSQL_USER: app
      MYSQL_PASSWORD: app
    ports:
      - "3306:3306"
    volumes:
      - mysqldata:/var/lib/mysql

volumes:
  mysqldata:
```

### SQLite — skip (file-based, no container needed)

Default `DATABASE_URL` in `.env.example`:
- Postgres: `postgresql://postgres:postgres@localhost:5432/app`
- MySQL: `mysql://app:app@localhost:3306/app`
- SQLite: `file:./dev.db`

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
3. [if DB && not SQLite] docker compose up -d
4. [if Prisma] npx prisma migrate dev --name init
5. npm run dev

[if backoffice or both]
→ Run /ebm-auth to add authentication
```
