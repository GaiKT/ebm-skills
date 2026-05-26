# ebm-form Reference

## Input required from user

```
1. Form type      — create/edit | search/filter
2. Feature name   — e.g. "users", "products"
3. Prisma model   — e.g. "User" (for create/edit) or skip for search forms
4. Fields         — auto-detect from prisma/schema.prisma if exists
                    else: "name:string, email:email, role:select, active:boolean"
5. For select fields: options list — e.g. "admin,user,viewer"
6. For relation fields: related model + label/value fields
```

## Field type mapping

| Type | Component | Zod type |
|------|-----------|----------|
| `string` | `<input type="text">` | `z.string()` |
| `email` | `<input type="email">` | `z.string().email()` |
| `password` | `<input type="password">` | `z.string().min(8)` |
| `number` | `<input type="number">` | `z.coerce.number()` |
| `boolean` | `<input type="checkbox">` | `z.boolean()` |
| `date` | `<input type="date">` | `z.coerce.date()` |
| `select` | `<select>` | `z.enum([...options])` |
| `textarea` | `<textarea>` | `z.string()` |
| `file` | `<input type="file">` | `z.instanceof(File).optional()` |
| `richtext` | Tiptap editor | `z.string()` |
| `relation` | async `<select>` fetch from API | `z.number()` or `z.string()` |

---

## Files to generate

### Create/Edit form

| File | Purpose |
|------|---------|
| `src/components/forms/[Feature]Form.tsx` | Form component (create + edit mode) |
| `src/lib/schemas/[feature].schema.ts` | Zod schema (shared with API) |
| `src/app/api/[feature]/route.ts` | POST (create) endpoint |
| `src/app/api/[feature]/[id]/route.ts` | PUT (update) + DELETE endpoint |

### Search/Filter form

| File | Purpose |
|------|---------|
| `src/components/forms/[Feature]FilterForm.tsx` | Filter form component |
| `src/lib/schemas/[feature].schema.ts` | Zod schema for filter params |

---

## Template: `src/lib/schemas/[feature].schema.ts`

```typescript
import { z } from 'zod'

export const create[Feature]Schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  // role: z.enum(['admin', 'user', 'viewer']),
  // active: z.boolean().default(true),
  // birthDate: z.coerce.date().optional(),
})

export const update[Feature]Schema = create[Feature]Schema.partial()

export type Create[Feature]Input = z.infer<typeof create[Feature]Schema>
export type Update[Feature]Input = z.infer<typeof update[Feature]Schema>
```

---

## Template: `src/components/forms/[Feature]Form.tsx`

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { create[Feature]Schema, type Create[Feature]Input } from '@/lib/schemas/[feature].schema'

interface [Feature]FormProps {
  defaultValues?: Partial<Create[Feature]Input>
  id?: number | string  // present = edit mode
}

export function [Feature]Form({ defaultValues, id }: [Feature]FormProps) {
  const router = useRouter()
  const isEdit = !!id

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Create[Feature]Input>({
    resolver: zodResolver(create[Feature]Schema),
    defaultValues,
  })

  async function onSubmit(data: Create[Feature]Input) {
    const url = isEdit ? `/api/[feature]/${id}` : `/api/[feature]`
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      alert(err.message ?? 'Something went wrong')
      return
    }

    router.push('/dashboard/[feature]')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      {/* string field example */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
        <input
          {...register('name')}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="Enter name"
        />
        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
      </div>

      {/* email field example */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
        <input
          type="email"
          {...register('email')}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="Enter email"
        />
        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
      </div>

      {/* select field example
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Role</label>
        <select {...register('role')}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        {errors.role && <p className="mt-1 text-xs text-red-400">{errors.role.message}</p>}
      </div>
      */}

      {/* boolean field example
      <div className="flex items-center gap-3">
        <input type="checkbox" id="active" {...register('active')}
          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500" />
        <label htmlFor="active" className="text-sm font-medium text-slate-300">Active</label>
      </div>
      */}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
```

---

## Template: `src/app/api/[feature]/route.ts` (POST)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { prisma } from '@/lib/prisma'
import { create[Feature]Schema } from '@/lib/schemas/[feature].schema'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = create[Feature]Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const record = await prisma.[model].create({ data: parsed.data })
  return NextResponse.json(record, { status: 201 })
}
```

## Template: `src/app/api/[feature]/[id]/route.ts` (PUT + DELETE)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { prisma } from '@/lib/prisma'
import { update[Feature]Schema } from '@/lib/schemas/[feature].schema'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = update[Feature]Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const record = await prisma.[model].update({
    where: { id: Number(params.id) },
    data: parsed.data,
  })
  return NextResponse.json(record)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.[model].delete({ where: { id: Number(params.id) } })
  return NextResponse.json({ success: true })
}
```

---

## Template: Search/Filter form

```typescript
// src/components/forms/[Feature]FilterForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { z } from 'zod'

const filterSchema = z.object({
  search: z.string().optional(),
  // status: z.enum(['active', 'inactive', '']).optional(),
  // dateFrom: z.string().optional(),
  // dateTo: z.string().optional(),
})

type FilterInput = z.infer<typeof filterSchema>

export function [Feature]FilterForm() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { register, handleSubmit, reset } = useForm<FilterInput>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      search: searchParams.get('search') ?? '',
    },
  })

  function onSubmit(data: FilterInput) {
    const params = new URLSearchParams()
    Object.entries(data).forEach(([k, v]) => { if (v) params.set(k, v) })
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  function onReset() {
    reset()
    router.push(pathname)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Search</label>
        <input
          {...register('search')}
          placeholder="Search..."
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 w-56"
        />
      </div>
      {/* Add more filter fields here */}
      <button type="submit"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
        Filter
      </button>
      <button type="button" onClick={onReset}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors">
        Reset
      </button>
    </form>
  )
}
```

---

## UI Library variants

### shadcn/ui
Replace inputs with `<Input>`, `<Select>`, `<Checkbox>` from shadcn.
Wrap fields in `<FormField>`, `<FormControl>`, `<FormMessage>` from `@/components/ui/form`.

### Ant Design
```typescript
import { Form, Input, Select, Button } from 'antd'
// Use Form.useForm() instead of RHF
// Validation via Form rules prop
// Note: Ant Design has its own form system — skip RHF when using antd
```

### MUI
```typescript
import { TextField, Select, Button } from '@mui/material'
// Keep RHF, use Controller wrapper for MUI components:
// <Controller name="field" control={control} render={({ field }) => <TextField {...field} />} />
```

---

## Required dependencies

```bash
npm install react-hook-form @hookform/resolvers zod
```

---

## Post-generation summary

```
✓ Generated [N] files for [feature] form

Files:
  src/components/forms/[Feature]Form.tsx
  src/lib/schemas/[feature].schema.ts
  src/app/api/[feature]/route.ts          (POST)
  src/app/api/[feature]/[id]/route.ts     (PUT, DELETE)

TODO in generated files:
  1. Uncomment/add field blocks in [Feature]Form.tsx
  2. Add select options for enum fields
  3. Update Prisma model name in API routes (marked with [model])

Install: npm install react-hook-form @hookform/resolvers zod
```
