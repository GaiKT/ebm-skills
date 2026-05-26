# ebm-upload Reference

## Input required from user

```
1. Upload mode    — single | multiple
2. Feature name   — e.g. "avatar", "documents"
3. Storage        — local | s3
4. Allowed types  — e.g. "image/jpeg,image/png,application/pdf"
5. Max file size  — e.g. "5MB"
```

---

## Files to generate

| File | Purpose |
|------|---------|
| `src/components/upload/[Feature]Uploader.tsx` | Drag & drop UI + progress + preview |
| `src/app/api/upload/[feature]/route.ts` | POST endpoint — validate + store |
| `src/lib/upload/[feature].config.ts` | Storage config + validation rules |

---

## Template: `src/lib/upload/[feature].config.ts`

```typescript
export const [feature]UploadConfig = {
  maxSize: 5 * 1024 * 1024, // 5MB — replace with user's value
  allowedTypes: ['image/jpeg', 'image/png'], // replace with user's list
  multiple: false, // true for multiple upload mode

  // local storage
  uploadDir: 'public/uploads/[feature]',
  publicPath: '/uploads/[feature]',

  // s3 (only used when STORAGE=s3)
  s3Prefix: '[feature]/',
}

export type UploadResult = {
  url: string
  filename: string
  size: number
  mimeType: string
}
```

---

## Template: `src/app/api/upload/[feature]/route.ts`

### Local storage variant

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { [feature]UploadConfig } from '@/lib/upload/[feature].config'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const files = formData.getAll('file') as File[]

  if (!files.length) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const results = []

  for (const file of files) {
    if (!([feature]UploadConfig.allowedTypes as string[]).includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed` },
        { status: 422 }
      )
    }

    if (file.size > [feature]UploadConfig.maxSize) {
      return NextResponse.json(
        { error: `File exceeds max size of ${[feature]UploadConfig.maxSize / 1024 / 1024}MB` },
        { status: 422 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const uploadDir = path.join(process.cwd(), [feature]UploadConfig.uploadDir)

    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, filename), buffer)

    results.push({
      url: `${[feature]UploadConfig.publicPath}/${filename}`,
      filename,
      size: file.size,
      mimeType: file.type,
    })
  }

  return NextResponse.json([feature]UploadConfig.multiple ? results : results[0], { status: 201 })
}
```

### S3 storage variant

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { [feature]UploadConfig } from '@/lib/upload/[feature].config'

const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'auto',
  endpoint: process.env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const files = formData.getAll('file') as File[]

  if (!files.length) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const results = []

  for (const file of files) {
    if (!([feature]UploadConfig.allowedTypes as string[]).includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed` },
        { status: 422 }
      )
    }

    if (file.size > [feature]UploadConfig.maxSize) {
      return NextResponse.json(
        { error: `File exceeds max size of ${[feature]UploadConfig.maxSize / 1024 / 1024}MB` },
        { status: 422 }
      )
    }

    const bytes = await file.arrayBuffer()
    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const key = `${[feature]UploadConfig.s3Prefix}${filename}`

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: file.type,
    }))

    const url = `${process.env.S3_PUBLIC_URL}/${key}`
    results.push({ url, filename, size: file.size, mimeType: file.type })
  }

  return NextResponse.json([feature]UploadConfig.multiple ? results : results[0], { status: 201 })
}
```

---

## Template: `src/components/upload/[Feature]Uploader.tsx`

### Single file mode

```typescript
'use client'

import { useCallback, useRef, useState } from 'react'

interface UploadResult {
  url: string
  filename: string
  size: number
  mimeType: string
}

interface [Feature]UploaderProps {
  onUpload?: (result: UploadResult) => void
  className?: string
}

export function [Feature]Uploader({ onUpload, className }: [Feature]UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File) => {
    setError(null)
    setUploading(true)
    setProgress(0)

    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file))
    }

    // Simulate progress (XMLHttpRequest for real progress tracking)
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90))
    }, 100)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload/[feature]', { method: 'POST', body: formData })
      clearInterval(interval)

      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Upload failed')
        setPreview(null)
        return
      }

      setProgress(100)
      const result: UploadResult = await res.json()
      onUpload?.(result)
    } finally {
      setUploading(false)
      clearInterval(interval)
    }
  }, [onUpload])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }, [upload])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
        }`}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-40 rounded-lg object-contain mb-3" />
        ) : (
          <div className="text-slate-400 text-center">
            <svg className="w-10 h-10 mx-auto mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-medium text-slate-300">Drop file here or click to browse</p>
            <p className="text-xs text-slate-500 mt-1">Max size: [maxSize]</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="[allowedTypes]"
          onChange={onInputChange}
        />
      </div>

      {uploading && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
```

### Multiple file mode

```typescript
'use client'

import { useCallback, useRef, useState } from 'react'

interface UploadResult {
  url: string
  filename: string
  size: number
  mimeType: string
}

interface FileItem {
  file: File
  preview: string | null
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  result?: UploadResult
  error?: string
}

interface [Feature]UploaderProps {
  onUpload?: (results: UploadResult[]) => void
  className?: string
}

export function [Feature]Uploader({ onUpload, className }: [Feature]UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [items, setItems] = useState<FileItem[]>([])

  const updateItem = (index: number, patch: Partial<FileItem>) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  const uploadFile = async (file: File, index: number) => {
    updateItem(index, { status: 'uploading', progress: 10 })

    const interval = setInterval(() => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index && item.status === 'uploading'
            ? { ...item, progress: Math.min(item.progress + 10, 90) }
            : item
        )
      )
    }, 100)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/[feature]', { method: 'POST', body: formData })
      clearInterval(interval)

      if (!res.ok) {
        const err = await res.json()
        updateItem(index, { status: 'error', error: err.error ?? 'Upload failed', progress: 0 })
        return null
      }

      const result: UploadResult = await res.json()
      updateItem(index, { status: 'done', progress: 100, result })
      return result
    } catch {
      clearInterval(interval)
      updateItem(index, { status: 'error', error: 'Upload failed', progress: 0 })
      return null
    }
  }

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const newItems: FileItem[] = Array.from(files).map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      progress: 0,
      status: 'pending',
    }))

    setItems((prev) => {
      const startIndex = prev.length
      const next = [...prev, ...newItems]

      // Upload all new files
      newItems.forEach((_, i) => {
        uploadFile(files[i] instanceof File ? files[i] as File : Array.from(files)[i], startIndex + i)
          .then((result) => {
            if (result) {
              setItems((current) => {
                const results = current.filter((x) => x.status === 'done').map((x) => x.result!)
                onUpload?.(results)
                return current
              })
            }
          })
      })

      return next
    })
  }, [onUpload])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
          dragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
        }`}
      >
        <svg className="w-8 h-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm font-medium text-slate-300">Drop files here or click to browse</p>
        <p className="text-xs text-slate-500 mt-1">Max [maxSize] per file</p>
        <input ref={inputRef} type="file" className="hidden" multiple accept="[allowedTypes]"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files) }} />
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 bg-slate-800 rounded-lg px-3 py-2">
              {item.preview
                ? <img src={item.preview} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                : <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">{item.file.name}</p>
                {item.status === 'uploading' && (
                  <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                    <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === 'error' && <p className="text-xs text-red-400 mt-0.5">{item.error}</p>}
              </div>
              <span className={`text-xs flex-shrink-0 ${
                item.status === 'done' ? 'text-green-400' :
                item.status === 'error' ? 'text-red-400' :
                item.status === 'uploading' ? 'text-blue-400' : 'text-slate-500'
              }`}>
                {item.status === 'done' ? '✓' : item.status === 'error' ? '✗' : item.status === 'uploading' ? `${item.progress}%` : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## S3 env vars (append to `.env.example`)

```env
# Upload — S3-compatible (AWS S3 / Cloudflare R2 / MinIO)
S3_ENDPOINT=              # leave blank for AWS, set for R2/MinIO e.g. https://xxx.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=
S3_PUBLIC_URL=            # CDN or public endpoint e.g. https://cdn.example.com
```

## Required packages

```bash
# S3 storage only
npm install @aws-sdk/client-s3
```

---

## Post-generation summary

```
✓ Generated 3 files for [feature] upload

Files:
  src/components/upload/[Feature]Uploader.tsx
  src/app/api/upload/[feature]/route.ts
  src/lib/upload/[feature].config.ts

[if s3]
  Install: npm install @aws-sdk/client-s3
  Env vars appended to .env.example

Usage:
  import { [Feature]Uploader } from '@/components/upload/[Feature]Uploader'
  <[Feature]Uploader onUpload={(result) => console.log(result.url)} />
```
