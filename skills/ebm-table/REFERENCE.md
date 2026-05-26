# ebm-table Reference

## Input required from user

```
1. Feature name   — e.g. "users", "products" (used for file/route naming)
2. Prisma model   — e.g. "User", "Product" (used in Prisma queries)
3. Columns        — e.g. "name:string, email:string, role:enum, createdAt:date"
4. Optional features:
   - Column filters? (yes/no)
   - Row selection + bulk actions? (yes/no)
   - Export CSV/Excel? (yes/no)
   - Expandable rows? (yes/no)
```

## Config detection
Read `ebm.config.json` for `uiLib` and `projectType`.
- `projectType: backoffice` → route: `src/app/(dashboard)/[feature]/page.tsx`
- `projectType: landing` → route: `src/app/[feature]/page.tsx`
- `projectType: both` → ask which section

---

## Files to generate

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/[feature]/page.tsx` | Page — reads URL params, passes to table |
| `src/components/tables/[Feature]Table.tsx` | Table component with columns, actions |
| `src/app/api/[feature]/route.ts` | GET endpoint with pagination/search/sort |
| `src/lib/schemas/[feature].schema.ts` | Zod schema for query params validation |

---

## URL query params pattern

```
GET /api/[feature]?page=1&pageSize=10&search=&sortBy=createdAt&sortOrder=desc
```

Response shape:
```typescript
{
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

---

## Template: `src/lib/schemas/[feature].schema.ts`

```typescript
import { z } from 'zod'

export const [feature]QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(''),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type [Feature]Query = z.infer<typeof [feature]QuerySchema>
```

---

## Template: `src/app/api/[feature]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { prisma } from '@/lib/prisma'
import { [feature]QuerySchema } from '@/lib/schemas/[feature].schema'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = Object.fromEntries(req.nextUrl.searchParams)
  const query = [feature]QuerySchema.parse(params)

  const where = query.search
    ? {
        OR: [
          // Add searchable string fields here e.g.:
          // { name: { contains: query.search, mode: 'insensitive' } },
          // { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : {}

  const [data, total] = await Promise.all([
    prisma.[model].findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { [query.sortBy]: query.sortOrder },
    }),
    prisma.[model].count({ where }),
  ])

  return NextResponse.json({
    data,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize),
  })
}
```

---

## Template: `src/app/(dashboard)/[feature]/page.tsx`

```typescript
import { Suspense } from 'react'
import { [Feature]Table } from '@/components/tables/[Feature]Table'

export default function [Feature]Page() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">[Feature Label]</h1>
        <a
          href="/dashboard/[feature]/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add [Item]
        </a>
      </div>
      <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
        <[Feature]Table />
      </Suspense>
    </div>
  )
}
```

---

## Template: `src/components/tables/[Feature]Table.tsx` (shadcn/ui)

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface [Feature]Row {
  id: number | string
  // Add columns from user input
}

interface TableResponse {
  data: [Feature]Row[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function [Feature]Table() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 10)
  const search = searchParams.get('search') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'createdAt'
  const sortOrder = (searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc'

  const [data, setData] = useState<TableResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const setParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    if (key !== 'page') params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search, sortBy, sortOrder })
    fetch(`/api/[feature]?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [page, pageSize, search, sortBy, sortOrder])

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b border-slate-700">
        <input
          type="text"
          placeholder="Search..."
          defaultValue={search}
          onChange={(e) => setParam('search', e.target.value)}
          className="w-full max-w-sm bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              {/* Generate th per column — add onClick for sort */}
              <th className="text-left px-4 py-3 font-medium cursor-pointer hover:text-white"
                onClick={() => { setParam('sortBy', 'name'); setParam('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc') }}>
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={99} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={99} className="px-4 py-8 text-center text-slate-500">No data found</td></tr>
            ) : (
              data?.data.map((row) => (
                <tr key={row.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  {/* Generate td per column */}
                  <td className="px-4 py-3 text-white">{(row as any).name}</td>
                  <td className="px-4 py-3 text-slate-300">{(row as any).email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a href={`/dashboard/[feature]/${row.id}`}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View</a>
                      <a href={`/dashboard/[feature]/${row.id}/edit`}
                        className="text-xs text-slate-400 hover:text-white transition-colors">Edit</a>
                      <button onClick={() => {/* delete handler */}}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
          <span className="text-sm text-slate-400">
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}
              className="px-3 py-1 text-sm rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >← Prev</button>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setParam('page', String(page + 1))}
              className="px-3 py-1 text-sm rounded bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## UI Library variants

### Ant Design
Replace table body with `<Table>` component:
```typescript
import { Table, Input } from 'antd'
// columns array with { title, dataIndex, sorter, render }
// Use Table's pagination prop: { current: page, pageSize, total, onChange }
```

### MUI
Replace with `<DataGrid>`:
```typescript
import { DataGrid } from '@mui/x-data-grid'
// columns array with { field, headerName, sortable, renderCell }
// paginationModel={{ page: page-1, pageSize }}, onPaginationModelChange
```

---

## Optional: Column filters
Add filter dropdowns above table:
```typescript
const status = searchParams.get('status') ?? ''
// <select onChange={(e) => setParam('status', e.target.value)}>
// Add to API where clause: ...(status && { status })
```

## Optional: Row selection + bulk actions
```typescript
const [selected, setSelected] = useState<Set<string>>(new Set())
// Checkbox column + bulk action bar shown when selected.size > 0
// Bulk actions: delete selected, export selected
```

## Optional: Export CSV
```typescript
// Add button → GET /api/[feature]?export=csv (no pagination, all rows)
// API: if (export === 'csv') return CSV response with Content-Disposition header
```

---

## Post-generation summary
```
✓ Generated 4 files for [feature] table

Files:
  src/app/(dashboard)/[feature]/page.tsx
  src/components/tables/[Feature]Table.tsx
  src/app/api/[feature]/route.ts
  src/lib/schemas/[feature].schema.ts

TODO in generated files:
  1. Add OR search fields in route.ts (marked with comment)
  2. Add column td cells in [Feature]Table.tsx
  3. Implement delete handler
```
