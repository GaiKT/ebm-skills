# ebm-thai Reference

## Purpose
Enforce formal Thai language in all UI labels, buttons, messages, and placeholders.
Apply this glossary whenever generating Thai text in any ebm-skills command.

---

## Glossary — Actions (ปุ่ม / เมนู)

| ❌ ไม่ทางการ | ✅ ทางการ |
|-------------|----------|
| ลบ | ลบข้อมูล |
| แก้ | แก้ไข |
| เพิ่ม | เพิ่มข้อมูล |
| ดู | ดูรายละเอียด |
| หา / ค้น | ค้นหา |
| กด | คลิก |
| ใส่ | กรอก |
| ส่ง | ส่งข้อมูล |
| บันทึก | บันทึกข้อมูล |
| ออก | ออกจากระบบ |
| เข้า | เข้าสู่ระบบ |
| กลับ | ย้อนกลับ |

## Glossary — Status / Toggle

| ❌ ไม่ทางการ | ✅ ทางการ |
|-------------|----------|
| เปิด (toggle) | เปิดใช้งาน |
| ปิด (toggle) | ปิดการใช้งาน |
| ใช้งาน / ไม่ใช้ | ใช้งาน / ไม่ใช้งาน |
| โอเค / ok | ตกลง |

## Glossary — Form / Placeholder

| ❌ ไม่ทางการ | ✅ ทางการ |
|-------------|----------|
| ใส่ชื่อ... | กรอกชื่อ |
| ใส่อีเมล... | กรอกอีเมล |
| เลือก... | โปรดเลือก |

## Glossary — Messages / Feedback

| ❌ ไม่ทางการ | ✅ ทางการ |
|-------------|----------|
| ลบแล้ว | ลบข้อมูลเรียบร้อยแล้ว |
| บันทึกแล้ว | บันทึกข้อมูลเรียบร้อยแล้ว |
| ผิดพลาด | เกิดข้อผิดพลาด |
| โหลด... | กำลังโหลดข้อมูล |
| คุณ (ในข้อความ) | ผู้ใช้งาน |

## Glossary — Ownership pattern

| ❌ ไม่ทางการ | ✅ ทางการ |
|-------------|----------|
| โปรไฟล์ของฉัน | ข้อมูลส่วนตัว |
| รายการของฉัน | รายการ |
| งานของฉัน | งานที่รับผิดชอบ |
| การแจ้งเตือนของฉัน | การแจ้งเตือน |

**Rule:** ตัด "ของฉัน" / "ของคุณ" ออกทั้งหมด ใช้ชื่อ section แทน

---

## `/ebm-thai` — Scan & Fix mode

### Step 1 — Scan codebase
Search for Thai text in `.tsx`, `.ts`, `.jsx`, `.js` files:
- String literals containing Thai characters
- JSX text nodes
- Placeholder / label / title / button text

### Step 2 — Identify violations
Match against glossary. Flag:
- Exact matches (ลบ, แก้, ใส่ ฯลฯ)
- Pattern "X ของฉัน" / "X ของคุณ"
- Casual pronouns (คุณ, ฉัน in UI-facing text)

### Step 3 — Present findings
Show a table:

```
File                                     | Line | Found        | Suggestion
----------------------------------------|------|--------------|------------------
src/components/tables/UserTable.tsx     |  42  | "ลบ"         | "ลบข้อมูล"
src/components/forms/ProfileForm.tsx    |  18  | "โปรไฟล์ของฉัน" | "ข้อมูลส่วนตัว"
src/app/(dashboard)/dashboard/page.tsx  |  67  | "บันทึกแล้ว"  | "บันทึกข้อมูลเรียบร้อยแล้ว"
```

### Step 4 — Ask before fixing
```
พบ [N] คำที่ควรแก้ไข
แก้ไขทั้งหมดเลย? (yes/no/เลือกทีละไฟล์)
```

### Step 5 — Apply fixes
Replace strings in-place. Preserve surrounding JSX, string interpolation, and formatting.

---

## Embed rules (used by all ebm-skills commands)

When generating ANY Thai-language UI text, apply these rules automatically:

1. **Button labels** — ใช้คำกริยาทางการ: "บันทึกข้อมูล" ไม่ใช่ "บันทึก" เมื่อเป็น action หลัก
2. **Placeholder text** — ขึ้นต้นด้วย "กรอก" หรือ "โปรดเลือก" เสมอ
3. **Success messages** — ลงท้ายด้วย "เรียบร้อยแล้ว"
4. **Error messages** — ขึ้นต้นด้วย "เกิดข้อผิดพลาด"
5. **Section titles** — ห้ามมีคำว่า "ของฉัน" / "ของคุณ" ใช้ชื่อ section ตรงๆ
6. **Toggle labels** — ใช้ "เปิดใช้งาน" / "ปิดการใช้งาน" ไม่ใช่ "เปิด" / "ปิด"
7. **Confirmation dialogs** — ใช้ "ยืนยัน" + ชื่อ action เช่น "ยืนยันการลบข้อมูล"

---

## Post-scan summary template

```
✓ สแกน [N] ไฟล์ พบ [N] คำที่ควรแก้ไข

แก้ไขแล้ว:
  src/components/... (3 คำ)
  src/app/...       (1 คำ)

ไม่พบปัญหา:
  src/lib/...
```
