---
name: ebm-mask
description: Default data-masking / PII-protection practice for every project (PDPA). Apply automatically whenever writing or reviewing code that touches personal data — DB schemas, API responses, logging, error handling, alerts (Slack/Discord/LINE), Sentry, audit logs, exports (Excel/CSV/PDF), OTP/token/password storage, analytics/LLM calls, or dev/test DB copies. Provides a central mask module (TypeScript + Python). Use when user invokes /ebm-mask, asks to mask/redact/hide personal data, add PDPA compliance, audit a codebase for PII leaks, or set up logging/alerts that may contain user data.
---

# /ebm-mask

แนวปฏิบัติ default สำหรับข้อมูลส่วนบุคคลในทุกโปรเจกต์ — ฉบับเต็ม: [REFERENCE.md](REFERENCE.md)

## Always-on rules (apply in every code change, no command needed)

1. **ตารางหลักเก็บค่าจริง** ถ้าระบบต้องใช้ค่านั้น · **mask ตอนข้อมูลออกจากระบบ** (API response, log, alert, export, DB copy)
2. **ความลับ = hash เท่านั้น** — password → argon2id/bcrypt(≥12) · OTP → HMAC (`OTP_HMAC_KEY`) · random token / API key → SHA-256 · ห้ามเก็บค่าจริง ห้าม log
3. **Mask ที่ server** — ห้ามส่งค่าเต็มแล้วปิดใน UI · ห้าม `return user` จาก ORM ทั้ง object → `select` เฉพาะฟิลด์ + DTO
4. **เปิด 4 ตัวท้ายเหมือนกันทุกที่** · ค่าสั้นกว่า 8 ตัว → `***` · ความลับ → `[REDACTED]` (ไม่บอกความยาว)
5. **Log แบบ allowlist** — ห้าม log `req.body`, ORM entity, error object ทั้งก้อน · ทุก log ผ่าน `maskObject` · error ผ่าน `serializeError` / `scrubText`
6. **จับคู่คนใน log ด้วย `pseudonymize()` (HMAC + `PII_HMAC_KEY`)** — ห้าม SHA-256 ธรรมดากับเลขบัตร/เบอร์/อีเมล
7. **บริการภายนอก** (Slack, Discord, LINE, Sentry, analytics, LLM) ได้แค่ user ID / pseudonym / IP / path / request ID
8. **ห้าม PII ใน URL / query string** → POST body หรือ ID ภายใน
9. **Reveal ค่าเต็ม** ต้องมี permission + reason + rate limit + audit + `Cache-Control: no-store`
10. **Export** ปิดเป็นค่าเริ่มต้น · ค่าเต็มต้องมีสิทธิ์แยก + จำกัดแถว + audit
11. **Module กลางตัวเดียว** (`lib/mask.ts` / `mask.py`) — ฟิลด์ใหม่เพิ่มใน `DEFAULT_POLICY` ห้ามเขียน mask function ใหม่
12. **Key แยกหน้าที่** (`PII_HMAC_KEY`, `OTP_HMAC_KEY`, `FIELD_ENC_KEY`, `FIELD_INDEX_KEY`) — ห้ามซ้ำ session/JWT secret · ห้าม commit
13. **นอก production ใช้ข้อมูลปลอม** — static masking script ต้อง guard ชื่อ DB `_masked`

### Mask format quick table

| ข้อมูล | Output |
|---|---|
| เลขบัตร / tax ID | `*********0121` (ห้ามเปิดหลักต้น) |
| เบอร์โทร | `******5678` (digits only, 0x / +66) |
| อีเมล | `so***@example.com` · local ≤ 4 ตัว → `***@example.com` |
| ชื่อ | log ใช้ user ID · UI `ส*** ใ***` |
| passport / bank account | `*****5678` / `******7890` |
| ที่อยู่ / วันเกิด / ข้อมูลอ่อนไหว ม.26 / free text | ไม่ log |
| password / OTP / token / key / cookie | `[REDACTED]` |

ถ้าโค้ดแยกไม่ออกว่าเลข 13 หลักเป็นบุคคลหรือนิติบุคคล → mask ทั้งหมด

## Command: `/ebm-mask` (setup or audit)

### Step 1 — Detect stack
- `package.json` → TypeScript · `pyproject.toml` / `requirements.txt` → Python · both → install both twins
- Check if a mask module already exists (`grep -r "maskObject\|mask_object\|maskEmail"`). If yes, compare to template and report drift instead of adding a second module.

### Step 2 — Install central module
- TS: copy [templates/mask.ts](templates/mask.ts) → `lib/mask.ts` (or `src/lib/mask.ts` if `src/` exists)
- Python: copy [templates/mask.py](templates/mask.py) → app core package
- Add `PII_HMAC_KEY=` (and `OTP_HMAC_KEY=` if OTP exists) to `.env.example` with comment `# openssl rand -base64 32`
- Add `lib/log.ts` (`logEvent`, `serializeError`) or Python `ScrubbingFormatter` per REFERENCE §9.3

### Step 3 — Data inventory
Scan schema (`prisma/schema.prisma`, Drizzle schema, SQLAlchemy models, migrations) → present table per REFERENCE §4.1 (field, type, level L0–L3, purpose, storage, who sees full). Add project-specific PII keys to `DEFAULT_POLICY`.

### Step 4 — Audit data exits
Grep and report violations with file:line:
- `console.log(` / `logger.*(` with `req.body`, `user`, `error`/`err` objects, raw email/phone vars
- `return user` / `NextResponse.json(user)` / ORM results without `select`
- `searchParams.get('email'|'phone'|'tax'…)`, `GET` routes taking PII in query
- Webhook / Slack / Discord / LINE / Sentry calls with raw identifiers
- `createHash('sha256')` / `hashlib.sha256` on email/phone/ID
- OTP / reset token / API key columns stored in plaintext
- Export routes without permission check / row limit / audit

Output:
```
File                          | Line | Violation                    | Fix
src/app/api/auth/route.ts     |  42  | logs req.body (password)     | logEvent + allowlist
```
Then ask: `พบ [N] จุด — แก้ทั้งหมดเลย? (yes / no / เลือกทีละไฟล์)`

### Step 5 — Tests
Add unit tests from REFERENCE §10.1 table and a canary test (§10.2) using the project's test runner.

## Embed rule

ทุก ebm-* command (และทุกงานเขียนโค้ด) ที่สร้าง API route, log, alert, export, auth/OTP, หรือ schema ที่มี PII → ใช้ rules ข้างบนอัตโนมัติ และเรียก module กลางแทนการ mask เอง. ก่อนจบงานให้ไล่ Checklist ใน REFERENCE §12.
