---
name: ebm-thai
description: Scan the codebase for informal Thai UI text (buttons, labels, placeholders, messages) and replace with formal Thai alternatives using a built-in glossary. Also enforces formal Thai automatically when generating any UI text. Use when user invokes /ebm-thai, asks to fix Thai language formality, or after generating Thai UI text that was rejected for being too informal.
---

# /ebm-thai

### Step 1 — Scan codebase
Search `.tsx`, `.ts`, `.jsx`, `.js` files for Thai text in:
- JSX text nodes, string literals, placeholder/label/title/button props

### Step 2 — Match against glossary
Flag violations from [REFERENCE.md](REFERENCE.md):
- Exact matches (ลบ, แก้, ใส่ ฯลฯ)
- Pattern "X ของฉัน" / "X ของคุณ" → ตัดออก ใช้ชื่อ section แทน
- Casual pronouns (คุณ, ฉัน) ในข้อความ UI

### Step 3 — Present findings table
Show file + line + found + suggestion. Then ask:
```
พบ [N] คำที่ควรแก้ไข — แก้ไขทั้งหมดเลย? (yes / no / เลือกทีละไฟล์)
```

### Step 4 — Apply fixes in-place
Preserve surrounding JSX, interpolation, and formatting.

See [REFERENCE.md](REFERENCE.md) for full glossary.

> **Embed rule:** เมื่อ generate Thai UI text ในทุก command ให้ใช้ glossary นี้อัตโนมัติ
