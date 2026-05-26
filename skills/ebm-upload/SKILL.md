---
name: ebm-upload
description: Generate a drag-and-drop file upload component with progress bar, image preview, MIME type validation, and file size limits. Supports single or multiple file upload and local disk or S3-compatible storage (AWS S3, Cloudflare R2, MinIO). Returns upload result to parent component. Use when user invokes /ebm-upload or asks to add file upload, image upload, or document upload.
---

# /ebm-upload

### Step 1 — Ask (in order)
```
1. Upload mode:   single | multiple
2. Feature name:  e.g. "avatar", "documents"
3. Storage:       local | s3
4. Allowed types: e.g. "image/jpeg,image/png,application/pdf"
5. Max file size: e.g. "5MB"
```

### Step 2 — Generate 3 files
```
src/components/upload/[Feature]Uploader.tsx   — drag & drop UI + progress + image preview
src/app/api/upload/[feature]/route.ts         — POST endpoint (validate + store)
src/lib/upload/[feature].config.ts            — storage config + validation rules
```

### Step 3 — Post-generation
- If storage = s3: `npm install @aws-sdk/client-s3` + append S3 env vars to `.env.example`
- Print usage example

See [REFERENCE.md](REFERENCE.md) for full templates (local + S3 variants, single + multiple modes).

## Shared rules
- Response: `{ url, filename, size, mimeType }` — parent component handles saving
- Path alias: `@/*` → `./src/*` always
- Thai UI text: use formal Thai — see `/ebm-thai` glossary
