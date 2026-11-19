# Data Masking: หลักการและวิธีทำ

> แนวทางกลางสำหรับทุกโปรเจกต์ที่มีข้อมูลส่วนบุคคล
> โค้ดตัวอย่างมี TypeScript (Node.js / Next.js) และ Python (FastAPI) — กฎของ 2 ภาษาตรงกันทุกข้อ
> อ้างอิง PDPA ในระดับหลักการเท่านั้น ไม่ใช่คำแนะนำทางกฎหมาย

**วิธีใช้เอกสารนี้กับโปรเจกต์ใหม่**

1. ทำบัญชีข้อมูลตาม [ข้อ 4](#4-ขั้นตอนเริ่มใช้กับโปรเจกต์)
2. คัดลอก module กลางใน [ข้อ 8](#8-module-กลาง) ไปไว้ในโปรเจกต์
3. ต่อ module เข้ากับทุกทางออกของข้อมูลตาม [ข้อ 9](#9-ต่อเข้ากับทางออกของข้อมูล)
4. ใส่ test ตาม [ข้อ 10](#10-ทดสอบ) และใช้ checklist ใน [ข้อ 12](#12-checklist) ทุก PR

---

## สารบัญ

1. [สรุปสั้น](#1-สรุปสั้น)
2. [คำศัพท์และเทคนิค](#2-คำศัพท์และเทคนิค)
3. [หลักการ](#3-หลักการ)
4. [ขั้นตอนเริ่มใช้กับโปรเจกต์](#4-ขั้นตอนเริ่มใช้กับโปรเจกต์)
5. [เก็บใน DB แบบไหน](#5-เก็บใน-db-แบบไหน)
6. [ใครเห็นอะไร](#6-ใครเห็นอะไร)
7. [รูปแบบตามชนิดข้อมูล](#7-รูปแบบตามชนิดข้อมูล)
8. [Module กลาง](#8-module-กลาง)
9. [ต่อเข้ากับทางออกของข้อมูล](#9-ต่อเข้ากับทางออกของข้อมูล)
10. [ทดสอบ](#10-ทดสอบ)
11. [ข้อผิดพลาดที่พบบ่อย](#11-ข้อผิดพลาดที่พบบ่อย)
12. [Checklist](#12-checklist)
13. [PDPA ที่เกี่ยวข้อง](#13-pdpa-ที่เกี่ยวข้อง)

---

## 1. สรุปสั้น

- **ตารางหลักเก็บค่าจริง** ถ้าระบบต้องใช้ค่านั้นทำงาน (ส่งอีเมล/SMS, ค้นหา, ส่งต่อ API)
- **ความลับเก็บเป็น hash** ได้แก่ รหัสผ่าน, OTP, token และ API key — ไม่เก็บค่าจริง
- **Masking ทำตอนข้อมูลออกจากระบบ** ได้แก่ API response, log, alert, export และสำเนา DB
- **ปิดที่ server** การปิดบนหน้าจออย่างเดียวไม่นับว่าปิด
- **เปิดแค่ 4 ตัวท้ายเหมือนกันทุกที่** ห้ามที่หนึ่งเปิดหัวแล้วอีกที่เปิดท้าย
- **จับคู่ข้อมูลใน log ด้วย HMAC ที่มี key ลับ** ไม่ใช้ SHA-256 ธรรมดา
- **มี module กลางที่เดียว** ทุกจุดเรียกใช้ตัวเดียวกัน และมี test กันรั่ว

## 2. คำศัพท์และเทคนิค

| เทคนิค | ย้อนกลับได้ไหม | ใช้กับ | ตัวอย่าง |
|---|---|---|---|
| **Masking** (ปิดบางส่วน) | ไม่ได้ | แสดงผล, log, alert | `*********1234` |
| **Redaction** (ตัดทิ้งทั้งค่า) | ไม่ได้ | ความลับ, ข้อมูลที่ไม่จำเป็น | `[REDACTED]` |
| **Pseudonymization** (HMAC) | ไม่ได้ถ้าไม่มี key | จับคู่คนเดียวกันใน log หรือ analytics | `v1:9f2c41d07ab3e815` |
| **Hashing** (bcrypt / argon2id / SHA-256) | ไม่ได้ | รหัสผ่าน, token สุ่ม | — |
| **Encryption** (AES-GCM) | ได้ ถ้ามี key | เก็บค่าจริงที่ต้องใช้แต่อยากป้องกันเพิ่ม | `v1:<iv>:<tag>:<ct>` |
| **Anonymization** | ไม่ได้ และเชื่อมกลับหาคนไม่ได้ | สถิติ, เปิดเผยข้อมูล | ยอดรวม, กลุ่มอายุ |
| **Static masking** | ไม่ได้ | สำเนา DB นอก production | dev / test / UAT |
| **Dynamic masking** | ข้อมูลจริงยังอยู่ใน DB | API ที่แสดงตามสิทธิ์ผู้ดู | admin เห็นแบบปิด เจ้าของเห็นเต็ม |

ข้อมูลที่ mask หรือ pseudonymize แล้ว **ยังเป็นข้อมูลส่วนบุคคล** ถ้ายังเชื่อมกลับไปหาตัวคนได้ จึงยังต้องคุมสิทธิ์และอายุการเก็บเหมือนเดิม มีแค่ anonymization ที่ทำให้ข้อมูลพ้นจากความเป็นข้อมูลส่วนบุคคล

## 3. หลักการ

1. **รู้ก่อนว่ามีอะไร** ทำบัญชีข้อมูล (data inventory) ทุกฟิลด์ที่เป็นข้อมูลส่วนบุคคล รวมถึง JSON, ข้อความอิสระ และไฟล์แนบ
2. **ไม่ใช้ก็ไม่เก็บ** ฟิลด์ที่ไม่มีงานไหนใช้ ไม่ต้องเก็บและไม่ต้อง log
3. **เก็บจริงเท่าที่ต้องใช้ค่าจริง** ความลับเก็บเป็น hash ส่วน log และ audit เก็บแบบ mask (ดู [ข้อ 5](#5-เก็บใน-db-แบบไหน))
4. **ปิดที่ server ก่อนส่งออก** ถ้า API ส่งค่าเต็มมา คนเปิด DevTools หรือยิง API ตรงก็เห็นได้
5. **เปิดน้อยที่สุดและเปิดฝั่งเดียวกันทุกที่** ถ้าหน้าจอหนึ่งเปิด 9 หลักแรก อีกหน้าเปิด 4 หลักท้าย เอามาต่อกันก็ได้ค่าเต็ม
6. **ความลับต้องตัดทิ้งทั้งค่า** รหัสผ่าน, OTP, token, cookie และ key ห้ามปิดแค่บางส่วน และไม่บอกแม้แต่ความยาว
7. **จับคู่ด้วย HMAC + key ลับ** ค่าที่มีรูปแบบได้ไม่มาก (เลขบัตร ~10¹² แบบ, เบอร์ ~10⁹, OTP 10⁶) ถ้าใช้ SHA-256 ธรรมดา GPU ไล่ย้อนกลับได้ในไม่กี่นาที
8. **log แบบ allowlist** ระบุฟิลด์ที่จะ log ทีละตัว ห้าม log `req.body`, ORM entity หรือ error object ทั้งก้อน
9. **ไม่ใส่ข้อมูลส่วนบุคคลใน URL** ค่าใน query string ไปโผล่ใน access log, browser history และ header `Referer` ให้ส่งใน body หรือใช้ ID แทน
10. **บริการภายนอกได้ข้อมูลน้อยที่สุด** Slack, Discord, Sentry, analytics และ LLM ได้แค่ ID หรือ pseudonym เพราะข้อมูลถูกเก็บนอกระบบและมักอยู่นอกประเทศ
11. **การเปิดดูค่าเต็มต้องมีสิทธิ์และถูกบันทึก** ต้องรู้ว่าใครเปิดของใคร เมื่อไร เพราะอะไร
12. **นอก production ใช้ข้อมูลปลอม** DB ของ dev/test/UAT, ไฟล์ dump และเอกสารส่งมอบ ต้องผ่าน static masking หรือเป็นข้อมูลสังเคราะห์
13. **มีจุดเดียว และมี test** ถ้ามีฟังก์ชัน mask หลายตัวที่ทำงานต่างกัน สุดท้ายจะมีบางทางที่ค่าเต็มหลุดออกไป

## 4. ขั้นตอนเริ่มใช้กับโปรเจกต์

### 4.1 ทำบัญชีข้อมูล

| ตาราง.ฟิลด์ | ชนิด | ระดับ | ใช้ทำอะไร | เก็บแบบ | ใครเห็นเต็ม |
|---|---|---|---|---|---|
| `users.email` | อีเมล | L1 | login, ส่ง OTP | ค่าจริง | เจ้าของ |
| `users.tax_id` | เลขบัตรประชาชน | L2 | ค้นหา, ส่ง API ภาครัฐ | ค่าจริง (+ เข้ารหัสถ้าจำเป็น) | เจ้าของ, เจ้าหน้าที่ผ่าน reveal |
| `users.password` | รหัสผ่าน | L3 | login | bcrypt / argon2id | ไม่มีใคร |
| `audit_log.new_value` | JSON | L1–L2 | ตามรอยการแก้ไข | mask | admin |

ต้องรวมคอลัมน์ JSON, ข้อความอิสระ (หมายเหตุ, คำตอบแบบฟอร์ม), ไฟล์แนบ, ตาราง log, cache และ search index ด้วย

### 4.2 จัดระดับ

| ระดับ | ตัวอย่าง | กฎ |
|---|---|---|
| **L3 ความลับ** | รหัสผ่าน, OTP, token, API key, private key | ไม่เก็บค่าจริง (hash) · ไม่ log เลย |
| **L2 ระบุตัวตนตรงหรืออ่อนไหว** | เลขบัตรประชาชน, passport, บัญชีธนาคาร, ข้อมูลสุขภาพ/ชีวภาพ (PDPA ม.26) | เก็บจริงเมื่อจำเป็นและพิจารณาเข้ารหัส · mask ทุกทางออก |
| **L1 ระบุตัวตนได้** | ชื่อ, อีเมล, เบอร์, ที่อยู่, วันเกิด, IP, พิกัด | mask ใน log, alert และหน้ารายการ |
| **L0 ไม่ใช่ข้อมูลส่วนบุคคล** | ชื่อ/เลขนิติบุคคล, ข้อมูลสาธารณะ, สถิติรวม | ไม่ต้อง mask |

ระวังกิจการบุคคลธรรมดา เช่นร้านค้าที่ใช้ชื่อเจ้าของ ข้อมูลกิจการแบบนี้คือข้อมูลของคน ถ้าโค้ดแยกไม่ออกว่าเลข 13 หลักเป็นของบุคคลหรือนิติบุคคล ให้ mask ทั้งหมดใน log

### 4.3 ขั้นต่อไป

1. ตัดสินรูปแบบการเก็บ ([ข้อ 5](#5-เก็บใน-db-แบบไหน))
2. กำหนดว่าช่องทางไหนเห็นได้แค่ไหน ([ข้อ 6](#6-ใครเห็นอะไร))
3. ใส่ module กลาง ([ข้อ 8](#8-module-กลาง)) และเพิ่มฟิลด์ของโปรเจกต์ลงใน policy
4. ต่อเข้ากับทุกทางออก ([ข้อ 9](#9-ต่อเข้ากับทางออกของข้อมูล))
5. ใส่ unit test และ canary test ([ข้อ 10](#10-ทดสอบ))

## 5. เก็บใน DB แบบไหน

| ระบบต้องใช้ฟิลด์นั้นทำอะไร | เก็บแบบไหน | ตัวอย่าง |
|---|---|---|
| ต้องใช้ค่าเต็ม: ส่งอีเมล/SMS, ค้นหา, ส่งต่อ API, แสดงให้เจ้าของ | **ค่าจริง** แล้วป้องกันด้วยสิทธิ์ DB, ไม่เปิด port ออกอินเทอร์เน็ต, เข้ารหัส backup และอาจเข้ารหัสคอลัมน์ ([9.8](#98-เข้ารหัสคอลัมน์--blind-index-ทางเลือก)) | email, phone, tax_id |
| แค่ตรวจว่าตรงกันไหม | **hash** | รหัสผ่าน → bcrypt/argon2id · OTP → HMAC · token สุ่ม → SHA-256 |
| แค่ตามรอย | **mask** หรือ **HMAC** | audit log, security log |
| ไม่ได้ใช้เลย | **ไม่เก็บ** | — |

**ทำไมไม่เก็บค่าที่ mask แล้วลงตารางหลัก** เพราะข้อมูลหายถาวร ระบบจะส่ง OTP ค้นหา หรือ sync กับระบบอื่นไม่ได้

**การเข้ารหัสคอลัมน์กันอะไรได้** กันได้กรณีไฟล์ dump, backup หรือ port DB หลุด แต่ **กันไม่ได้** ถ้าโดนเจาะผ่าน API ที่มีสิทธิ์ เพราะแอปถอดรหัสให้อยู่แล้ว ความเสี่ยงหลักจึงอยู่ที่ "ใครเข้าถึงได้" มากกว่า "เก็บรูปแบบไหน"

## 6. ใครเห็นอะไร

| ช่องทาง | เห็นได้แค่ไหน |
|---|---|
| หน้าจอของเจ้าของข้อมูลเอง | เต็ม |
| หน้ารายการหรือตารางของ admin / เจ้าหน้าที่ | ปิด · เปิดเต็มทีละรายผ่าน reveal ที่ต้องมีสิทธิ์ ([9.2](#92-เปิดดูค่าเต็ม-reveal--audit)) |
| Export (Excel / CSV / PDF) | ปิดเป็นค่าเริ่มต้น · ค่าเต็มเฉพาะผู้มีสิทธิ์ export PII, จำกัดจำนวนแถว และบันทึก audit |
| Application log / stdout / Cloud Logging | ปิด · อ้างตัวคนด้วย user ID |
| Audit log ใน DB | ปิด · หรือเก็บแค่ชื่อฟิลด์ที่เปลี่ยน |
| Alert (Slack / Discord / LINE / อีเมลแจ้งเตือน) | น้อยที่สุด: ประเภทเหตุ, user ID, pseudonym, IP, path, request ID |
| Error tracking (Sentry ฯลฯ) | message และ stack ผ่าน `scrubText` · ไม่ส่ง request body หรือ cookie |
| Analytics / LLM / บริการภายนอกอื่น | ID หรือ pseudonym เท่านั้น |
| DB dev / test / UAT, dump, เอกสารส่งมอบ | ข้อมูลที่ผ่าน static masking หรือข้อมูลสังเคราะห์ |

IP เป็นข้อยกเว้น เก็บเต็มใน security log ได้เพราะจำเป็นต่อการสืบสวน แต่ต้องจำกัดคนเข้าถึงและกำหนดอายุการเก็บ

## 7. รูปแบบตามชนิดข้อมูล

| ข้อมูล | ระดับ | ใน log / alert | ในหน้ารายการ | หมายเหตุ |
|---|---|---|---|---|
| เลขบัตรประชาชน / เลขผู้เสียภาษี | L2 | `*********0121` | `*********0121` | ไม่เปิดหลักต้น เพราะหลัก 2–5 บอกจังหวัด/อำเภอที่ออกบัตร |
| Passport | L2 | `*****5678` | `*****5678` | — |
| บัญชีธนาคาร | L2 | `******7890` | `******7890` | — |
| บัตรเครดิต | — | ไม่ควรเก็บเอง | 4 ตัวท้าย | ใช้ payment gateway · CVV ห้ามเก็บทุกกรณี (PCI DSS) |
| เบอร์โทร | L1 | `******5678` | `******5678` | ตัดเหลือแต่ตัวเลขก่อน ใช้ได้ทั้ง `0x` และ `+66` |
| อีเมล | L1 | `so***@example.com` | `so***@example.com` | ส่วนหน้า @ ไม่เกิน 4 ตัว → `***@example.com` · ซ่อนโดเมนด้วยถ้าเป็นโดเมนส่วนตัว |
| ชื่อ-นามสกุล | L1 | ใช้ user ID แทน | แสดงได้ หรือ `ส*** ใ***` | — |
| ที่อยู่ | L1 | ไม่ log | จังหวัด / อำเภอ | — |
| วันเกิด | L1 | ไม่ log | อายุ หรือปีเกิด | — |
| IP | L1 | เต็ม (security log เท่านั้น) | — | จำกัดสิทธิ์และอายุการเก็บ |
| พิกัด GPS | L1 | ทศนิยม 2 ตำแหน่ง (~1 กม.) | ตามงาน | — |
| ข้อมูลอ่อนไหว (PDPA ม.26) | L2 | ไม่ log | ตามสิทธิ์เฉพาะ | สุขภาพ, ศาสนา, ชีวภาพ, ประวัติอาชญากรรม ฯลฯ |
| ข้อความอิสระ (หมายเหตุ, คำตอบ) | ? | ไม่ log | ตามงาน | อาจมีข้อมูลส่วนบุคคลปนมา |
| รหัสผ่าน / OTP / token / key / cookie | L3 | `[REDACTED]` | ไม่แสดง | — |

**กรณีขอบที่ต้องรองรับ**

- ค่าที่สั้นกว่า 8 ตัวให้ปิดทั้งหมด เพราะเปิด 4 ตัวจะเหลือให้เดาน้อยเกินไป
- `null` และค่าว่างให้คงเดิม
- ค่าที่ไม่ใช่ string ให้แปลงก่อน
- ชื่อภาษาไทยให้ตัดตาม code point
- อีเมลที่มี `+` หรือมี `@` หลายตัว ให้ตัดที่ `@` ตัวสุดท้าย

## 8. Module กลาง

ทุกจุดที่ข้อมูลออกจากระบบต้องเรียก module นี้ ถ้าโปรเจกต์มีฟิลด์เพิ่ม ให้เพิ่มลงใน `DEFAULT_POLICY` แทนการเขียนฟังก์ชันใหม่

### 8.1 TypeScript

ไฟล์พร้อมใช้: [templates/mask.ts](templates/mask.ts) → คัดลอกไปที่ `lib/mask.ts` (หรือ `src/lib/mask.ts`)

Exports: `REDACTED`, `maskTail`, `maskThaiId`, `maskPhone`, `maskEmail`, `maskName`, `DEFAULT_POLICY`, `maskObject`, `scrubText`, `pseudonymize`

### 8.2 Python

ไฟล์พร้อมใช้: [templates/mask.py](templates/mask.py) → คัดลอกไปไว้ใน package ของแอป (เช่น `app/core/mask.py`)

Exports: `REDACTED`, `mask_tail`, `mask_thai_id`, `mask_phone`, `mask_email`, `mask_name`, `DEFAULT_POLICY`, `mask_object`, `scrub_text`, `pseudonymize`

`pseudonymize` ของทั้ง 2 ภาษาให้ผลตรงกันถ้าใช้ key เดียวกัน จึงจับคู่ log ข้ามระบบได้ — **ห้ามแก้กฎใน template ฝั่งเดียว** ถ้าแก้ต้องแก้ทั้งคู่

### 8.3 Key ที่ต้องใช้

| ตัวแปร | ใช้ทำอะไร | ถ้าหมุน key |
|---|---|---|
| `PII_HMAC_KEY` | `pseudonymize` ใน log และ alert | log เก่าจับคู่กับ log ใหม่ไม่ได้ |
| `OTP_HMAC_KEY` | digest ของ OTP ([9.7](#97-ความลับใน-db)) | OTP ที่ออกไปแล้วใช้ไม่ได้ (อายุไม่กี่นาที) |
| `FIELD_ENC_KEY` | เข้ารหัสคอลัมน์ ([9.8](#98-เข้ารหัสคอลัมน์--blind-index-ทางเลือก)) | ต้องถอดด้วย key เก่าแล้วเข้ารหัสใหม่ทุกแถว |
| `FIELD_INDEX_KEY` | blind index | ต้องคำนวณ index ใหม่ทุกแถว |

- สร้างด้วย `openssl rand -base64 32`
- **ห้ามใช้ key เดียวกับ session / JWT secret** และห้ามใช้ key เดียวกันหลายหน้าที่ — key หลุดหนึ่งตัวต้องไม่กระทบทุกอย่าง
- เก็บใน secret manager ไม่ commit ลง git และไม่ใส่ในไฟล์ส่งมอบ

## 9. ต่อเข้ากับทางออกของข้อมูล

### 9.1 API response (dynamic masking)

```ts
// Return only what the screen needs, masked by who is looking.
// Never `return user` from the ORM: it carries the password hash and every PII column.
const users = await db.user.findMany({
    select: { id: true, first_name: true, last_name: true, email: true, phone: true, tax_id: true },
})

type Viewer = { id: number }

export function toUserListItem(
    user: { id: number; first_name: string; last_name: string; email: string | null; phone: string; tax_id: string | null },
    viewer: Viewer,
) {
    // Owners see their own data; staff open a single record through the reveal endpoint (9.2).
    const full = viewer.id === user.id
    return {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: full ? user.email : maskEmail(user.email),
        phone: full ? user.phone : maskPhone(user.phone),
        taxId: full ? user.tax_id : maskThaiId(user.tax_id),
    }
}
```

- ฟิลด์ที่หน้าจอไม่ได้ใช้ ห้ามส่งมาแม้จะ mask แล้ว
- **ห้ามรับค่า PII ผ่าน query string** เช่น `GET /users?tax_id=...` ให้ใช้ `POST` + body หรือใช้ ID ภายในแทน

### 9.2 เปิดดูค่าเต็ม (reveal) + audit

ตัวอย่าง Next.js App Router — `requirePermission`, `consumeRateLimit`, `db`, `audit` เป็นฟังก์ชันของแต่ละโปรเจกต์

```ts
// app/api/users/[id]/reveal/route.ts
// Reveals are capped per staff member: normal support work stays well below 30 per hour,
// while bulk scraping through this endpoint hits the cap quickly and shows up in audit.
const REVEALS_PER_HOUR = 30

/** Returns one user's unmasked contact data to staff with PII_VIEW_FULL and records who looked. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const viewer = await requirePermission('PII_VIEW_FULL')
    if (viewer instanceof Response) return viewer // 401 / 403

    const { reason } = await req.json().catch(() => ({ reason: undefined }))
    if (typeof reason !== 'string' || reason.trim().length < 10) {
        return Response.json({ error: 'A reason of at least 10 characters is required' }, { status: 400 })
    }
    if (!consumeRateLimit(`reveal:${viewer.id}`, REVEALS_PER_HOUR, 60 * 60 * 1000)) {
        return Response.json({ error: 'Too many requests' }, { status: 429 })
    }

    const targetId = Number((await params).id)
    const user = await db.user.findUnique({
        where: { id: targetId },
        select: { email: true, phone: true, tax_id: true },
    })
    if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

    await audit('PII_REVEALED', { actorId: viewer.id, targetId, reason, fields: Object.keys(user) })
    // no-store: the full values must not stay in browser or proxy caches.
    return Response.json(user, { headers: { 'Cache-Control': 'no-store' } })
}
```

### 9.3 Log

**แบบไม่ใช้ library** ทุกบรรทัดผ่าน `maskObject` ผู้เรียกจึงลืมไม่ได้

```ts
// lib/log.ts
import { maskObject, scrubText } from './mask'

type Level = 'info' | 'warn' | 'error'

/** Writes one structured JSON line; `data` always passes through maskObject. */
export function logEvent(event: string, data: Record<string, unknown> = {}, level: Level = 'info') {
    const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...maskObject(data) })
    if (level === 'info') console.log(line)
    else console[level](line)
}

/** Error -> safe fields only. ORM validation errors print query arguments, so message and stack are scrubbed. */
export function serializeError(err: unknown) {
    if (!(err instanceof Error)) return { message: scrubText(String(err)) }
    return { name: err.name, message: scrubText(err.message), stack: scrubText(err.stack ?? '') }
}
```

ใช้งาน: `logEvent('user.updated', { userId, changes })` และ `logEvent('api.error', { path, error: serializeError(e) }, 'error')`

**pino** (Node)

```ts
import pino from 'pino'

export const log = pino({
    // Fast path for well-known locations; maskObject below covers everything else.
    redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], censor: REDACTED },
    formatters: { log: (obj) => maskObject(obj) },
    serializers: { err: serializeError },
})
```

**Python logging** — scrub ที่ formatter จึงครอบคลุม traceback ด้วย

```python
# logging_setup.py
import logging

from mask import scrub_text


class ScrubbingFormatter(logging.Formatter):
    """Formatter that scrubs personal data from the final line, tracebacks included."""

    def format(self, record: logging.LogRecord) -> str:
        """Format normally, then scrub.

        Args:
            record: The log record being emitted.
        """
        return scrub_text(super().format(record))


def setup_logging(level: int = logging.INFO) -> None:
    """Install the scrubbing formatter on the root logger.

    Args:
        level: Minimum level to emit.
    """
    handler = logging.StreamHandler()
    handler.setFormatter(ScrubbingFormatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    logging.basicConfig(level=level, handlers=[handler], force=True)
```

ส่วนข้อมูลแบบ structured ให้ใช้ `logger.info("user.updated %s", mask_object(payload))`

### 9.4 Error tracking และ alert

```ts
// Sentry: drop request bodies and cookies, scrub what remains.
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    sendDefaultPii: false,
    beforeSend(event) {
        if (event.message) event.message = scrubText(event.message)
        for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrubText(ex.value)
        if (event.request) {
            delete event.request.data
            delete event.request.cookies
        }
        if (event.extra) event.extra = maskObject(event.extra)
        return event
    },
})

// Chat alerts (Slack / Discord / LINE) are stored by a third party, usually abroad:
// IDs and pseudonyms only, never the raw email / phone / ID the attacker typed.
await sendAlert(
    `LOGIN_RATE_LIMITED user=${userId ?? '-'} account=${pseudonymize(identifier, 'login')} ip=${ip}`,
)
```

ถ้าต้องสืบว่าบัญชีไหนถูกโจมตี ให้คำนวณ `pseudonymize(<อีเมลที่สงสัย>, 'login')` แล้วค้นค่าใน log โดยไม่ต้องเก็บอีเมลดิบไว้ใน alert

### 9.5 Audit log

```ts
// Store masked snapshots, or better, only the names of the fields that changed.
await db.auditLog.create({
    data: {
        actorId,
        action: 'USER_UPDATED',
        targetId: user.id,
        changedFields: Object.keys(changes),
        oldValue: maskObject(pick(before, Object.keys(changes))),
        newValue: maskObject(changes),
    },
})
```

### 9.6 Export (Excel / CSV / PDF)

- ปิดเป็นค่าเริ่มต้น โดยใช้ฟังก์ชันแปลงแถวตัวเดียวกับ API ([9.1](#91-api-response-dynamic-masking))
- ค่าเต็มต้องมีสิทธิ์แยก (เช่น `PII_EXPORT_FULL`) และระบุเหตุผล
- จำกัดจำนวนแถวต่อครั้ง และจำกัดจำนวนต่อผู้ใช้ต่อชั่วโมง
- บันทึก audit ว่าใคร export อะไร กี่แถว ด้วย filter อะไร และแจ้งเตือนเมื่อเกินเกณฑ์
- ชื่อไฟล์ห้ามมีข้อมูลส่วนบุคคล และไฟล์ค่าเต็มต้องส่งผ่านช่องทางที่ปลอดภัย (ลิงก์หมดอายุ / เข้ารหัส) ไม่แนบอีเมล

### 9.7 ความลับใน DB

```ts
// lib/secret-codes.ts
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

/** 6-digit OTP from a CSPRNG. Store only otpDigest(): plain SHA-256 of 10^6 values is reversed instantly. */
export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

/**
 * Keyed digest of an OTP, bound to the user and the request reference so a code
 * cannot be replayed for another account or another request.
 * @throws Error when OTP_HMAC_KEY is missing or shorter than 32 characters
 */
export function otpDigest(userId: number, ref: string, code: string): string {
    const key = process.env.OTP_HMAC_KEY
    if (!key || key.length < 32) throw new Error('OTP_HMAC_KEY must be set (>= 32 characters)')
    return createHmac('sha256', key).update(`otp:${userId}:${ref}:${code}`).digest('hex')
}

/** Constant-time comparison of two hex digests, so response timing does not reveal matching prefixes. */
export function sameDigest(a: string, b: string): boolean {
    const x = Buffer.from(a, 'hex')
    const y = Buffer.from(b, 'hex')
    return x.length === y.length && timingSafeEqual(x, y)
}

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

/** Reset-link token: send `token` to the user, store only `digest`. 256 random bits make plain SHA-256 safe. */
export function newResetToken() {
    const token = randomBytes(32).toString('base64url')
    return { token, digest: sha256(token) }
}
```

- **รหัสผ่าน** ใช้ argon2id หรือ bcrypt (cost ≥ 12) — bcrypt อ่านแค่ 72 ไบต์แรก ให้จำกัดความยาวรหัสผ่าน
- **OTP** อายุ 5–10 นาที, ผิดได้ไม่เกิน 5 ครั้งต่อรหัส, ใช้ได้ครั้งเดียวแบบ atomic เช่น `UPDATE ... SET used_at = now() WHERE id = $1 AND used_at IS NULL` แล้วเช็คว่ามี 1 แถวที่ถูกแก้
- **API key** เก็บ `sha256(key)` คู่กับ prefix สั้น ๆ (เช่น `sk_live_ab12`) ไว้ให้คนอ่านแยกว่าเป็น key ไหน

### 9.8 เข้ารหัสคอลัมน์ + blind index (ทางเลือก)

ใช้เมื่อต้องเก็บค่าจริงของข้อมูลระดับ L2 แต่อยากให้ไฟล์ dump หรือ backup ที่หลุดออกไปอ่านไม่ได้

```ts
// lib/field-crypto.ts
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12 // 96-bit IV is the GCM recommendation; a fresh random IV per value avoids reuse
const TAG_BYTES = 16 // reject truncated tags, which would weaken GCM authentication

/** @throws Error when the variable is missing or does not decode to 32 bytes */
function loadKey(name: 'FIELD_ENC_KEY' | 'FIELD_INDEX_KEY'): Buffer {
    const key = Buffer.from(process.env[name] ?? '', 'base64')
    if (key.length !== 32) throw new Error(`${name} must be 32 bytes, base64-encoded (openssl rand -base64 32)`)
    return key
}

/**
 * Encrypts one column value as "v1:<iv>:<tag>:<ciphertext>" (base64url parts).
 * The version prefix allows key rotation: decrypt by version, re-encrypt with the new key.
 * @throws Error when FIELD_ENC_KEY is invalid
 */
export function encryptField(plain: string): string {
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv(ALGORITHM, loadKey('FIELD_ENC_KEY'), iv, { authTagLength: TAG_BYTES })
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join(':')
}

/**
 * Decrypts a value produced by encryptField.
 * @throws Error on an unknown format, a wrong key, or tampered data (GCM tag mismatch)
 */
export function decryptField(stored: string): string {
    const [version, iv, tag, data] = stored.split(':')
    if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported encrypted field format')
    const decipher = createDecipheriv(ALGORITHM, loadKey('FIELD_ENC_KEY'), Buffer.from(iv, 'base64url'), {
        authTagLength: TAG_BYTES,
    })
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

/**
 * Deterministic keyed hash for WHERE / UNIQUE on an encrypted column (exact match only).
 * Normalize before calling (digits only, lowercase email) or equal values will not match.
 * @throws Error when FIELD_INDEX_KEY is invalid
 */
export function blindIndex(normalized: string): string {
    return createHmac('sha256', loadKey('FIELD_INDEX_KEY')).update(normalized).digest('hex')
}
```

- Schema: `tax_id_enc TEXT` (ค่าที่เข้ารหัส) คู่กับ `tax_id_idx TEXT UNIQUE` (blind index) — ค้นด้วย `WHERE tax_id_idx = blindIndex(input)`
- **ข้อจำกัด:**
  - ค้นแบบ `LIKE`, เรียงลำดับ และช่วงค่าไม่ได้
  - กันไม่ได้ถ้าแอปถูกเจาะ
  - ต้องมีแผนหมุน key
  - ต้อง backfill ข้อมูลเดิมก่อน deploy โค้ดที่อ่านคอลัมน์ใหม่
- ถ้าใช้ ORM ให้เข้ารหัส/ถอดรหัสที่ชั้นเดียว (เช่น Prisma client extension) ไม่กระจายไปทุก route

### 9.9 สำเนา DB นอก production (static masking)

```sql
-- mask_copy.sql: run ONLY on a restored copy whose database name ends with _masked.
BEGIN;
-- The guard sits inside the transaction on purpose: if it fails, every statement below
-- fails too and COMMIT becomes ROLLBACK, even when psql runs without ON_ERROR_STOP.
DO $$
BEGIN
    IF current_database() !~ '_masked$' THEN
        RAISE EXCEPTION 'refusing to run on database %', current_database();
    END IF;
END $$;

UPDATE users SET
    -- .invalid is a reserved TLD (RFC 2606): mail to these addresses can never be delivered.
    email      = CASE WHEN email IS NULL THEN NULL ELSE 'user' || id || '@example.invalid' END,
    -- Derived from id so UNIQUE constraints still hold.
    phone      = '09' || lpad(id::text, 8, '0'),
    tax_id     = CASE WHEN tax_id IS NULL THEN NULL ELSE lpad(id::text, 13, '0') END,
    first_name = 'ผู้ใช้',
    last_name  = 'ทดสอบ ' || id,
    address    = NULL,
    -- One known test password for every account; put the real bcrypt hash here.
    password   = '$2b$12$REPLACE_WITH_BCRYPT_HASH_OF_TEST_PASSWORD';

-- Copies of the same data live in logs, JSON columns and one-time secrets.
UPDATE audit_log SET old_value = NULL, new_value = NULL;
TRUNCATE otp_codes, password_resets, sessions;
COMMIT;
```

- สร้างสำเนาด้วยชื่อที่ลงท้าย `_masked` เท่านั้น สคริปต์จะไม่ยอมรันกับ DB อื่น
- ถ้าแอปตรวจ checksum เลขบัตร ต้องสร้างหลักสุดท้ายให้ถูกตามสูตร
- อย่าลืมคอลัมน์ JSON, ข้อความอิสระ, ไฟล์แนบ (uploads), search index และ cache
- ถ้าต้องการกำหนดกฎแบบ declarative ให้ดู extension **PostgreSQL Anonymizer** (`anon`)
- ไฟล์ dump จาก production ห้ามวางในเครื่องส่วนตัว ห้ามแนบในเอกสารหรือไฟล์ส่งมอบ ถ้าต้องส่งให้คนอื่นใช้ ให้ส่งสำเนาที่ mask แล้ว

## 10. ทดสอบ

### 10.1 Unit test (ผลที่ต้องได้)

| ฟังก์ชัน | Input | Output |
|---|---|---|
| `maskThaiId` | `1-2345-67890-12-1` | `*********0121` |
| `maskPhone` | `081-234-5678` | `******5678` |
| `maskPhone` | `+66 81 234 5678` | `*******5678` |
| `maskEmail` | `somchai@example.com` | `so***@example.com` |
| `maskEmail` | `ab@x.co` | `***@x.co` |
| `maskTail` | `abc` | `***` |
| `maskName` | `สมชาย ใจดี` | `ส*** ใ***` |
| `maskObject` | `{ password: 'x', user: { phone: '0812345678' } }` | `{ password: '[REDACTED]', user: { phone: '******5678' } }` |
| `maskObject` | `{ accessToken: 'abc', shipping: 'EMS' }` | `{ accessToken: '[REDACTED]', shipping: 'EMS' }` |
| `scrubText` | `Invalid value "0812345678" for somchai@example.com` | `Invalid value "******5678" for so***@example.com` |
| `scrubText` | `Authorization: Bearer abc.def` | `Authorization: Bearer [REDACTED]` |
| `pseudonymize` | ค่าเดิม + purpose เดิม | ผลเดิมทุกครั้ง · purpose ต่างกันได้ผลต่างกัน |

ต้องทดสอบด้วยว่า `maskObject` ไม่แก้ object ต้นฉบับ และไม่ค้างเมื่อเจอ object ที่อ้างวนกัน

### 10.2 Canary test (กันรั่วทั้งระบบ)

unit test พิสูจน์ได้แค่ว่าฟังก์ชัน mask ถูก แต่ไม่ได้พิสูจน์ว่าทุกจุดเรียกใช้มัน canary test จึงสร้างผู้ใช้ด้วยค่าที่จำได้ชัด รัน flow จริง แล้วค้นค่านั้นในทุกอย่างที่ระบบส่งออก

```ts
// test/pii-canary.test.ts (Vitest). runLoginFailure / runSignup / runProfileUpdate are project flows.
const CANARY = {
    email: 'canary.pii.7f3a@example.invalid',
    phone: '0899990001',
    taxId: '1234567890121',
}

it('never writes canary PII to logs or outbound requests', async () => {
    const captured: string[] = []
    const out = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => (captured.push(String(chunk)), true))
    const err = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => (captured.push(String(chunk)), true))
    // Every webhook / Sentry / analytics call goes through fetch.
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => (captured.push(String(init?.body ?? '')), new Response('ok'))))

    await runLoginFailure(CANARY.email)
    await runSignup({ ...CANARY, password: 'wrong' })
    await runProfileUpdate(CANARY)

    out.mockRestore()
    err.mockRestore()
    const everything = captured.join('\n')
    for (const value of Object.values(CANARY)) expect(everything).not.toContain(value)
})
```

ขยายผลได้โดยค้นค่า canary ในตาราง log ของ DB, ไฟล์ export และ response ของ API รายการด้วย

## 11. ข้อผิดพลาดที่พบบ่อย

| ข้อผิดพลาด | ผล | ทางแก้ |
|---|---|---|
| ปิดเฉพาะใน UI | API ส่งค่าเต็ม เปิด DevTools ก็เห็น | mask ที่ server ([9.1](#91-api-response-dynamic-masking)) |
| `return user` จาก ORM ทั้ง object | hash รหัสผ่านและ PII ทุกคอลัมน์หลุดออกไป | `select` เฉพาะฟิลด์ + DTO |
| SHA-256 เลขบัตร / เบอร์ "เพื่อความปลอดภัย" | ไล่ย้อนกลับได้ในไม่กี่นาที | HMAC + key ลับ |
| ที่หนึ่งเปิดหัว อีกที่เปิดท้าย | เอามาต่อกันได้ค่าเต็ม | เปิด 4 ตัวท้ายทุกที่ |
| มีฟังก์ชัน mask หลายตัว | บางทางปิด บางทางไม่ปิด | module กลางตัวเดียว |
| log `req.body` หรือ error object ทั้งก้อน | รหัสผ่าน / OTP ไปอยู่ใน log | allowlist + `maskObject` + `serializeError` |
| error ของ ORM ส่งเข้า Sentry / Slack ตรง ๆ | validation error พิมพ์ค่าใน query ออกมา | `scrubText` ก่อนส่ง |
| ส่งค่าดิบเข้า Slack / Discord | ข้อมูลไปเก็บที่บริการภายนอกนอกประเทศ | ID + pseudonym |
| PII ใน URL / query string | ติด access log, history, Referer | POST body หรือ ID ภายใน |
| ใช้ key เดียวกับ session secret | key หลุดตัวเดียวกระทบทุกอย่าง | key แยกตามหน้าที่ |
| export ค่าเต็มเป็นค่าเริ่มต้น ไม่จำกัดแถว | ดึงข้อมูลทั้งระบบได้ในคำขอเดียว | ปิดเป็นค่าเริ่มต้น + สิทธิ์แยก + จำกัดแถว + audit |
| เก็บค่าที่ mask แล้วลงตารางหลัก | ภายหลังต้องใช้ค่าจริงแต่ไม่มีแล้ว | ตารางหลักเก็บจริง mask ตอนส่งออก |
| ใช้ข้อมูลจริงใน dev / test / UAT | สำเนาข้อมูลกระจายไปหลายเครื่อง | static masking ([9.9](#99-สำเนา-db-นอก-production-static-masking)) |
| OTP / reset token เก็บค่าจริง | คนที่อ่าน DB ได้ใช้รหัสแทนเจ้าของได้ทันที | HMAC / SHA-256 ([9.7](#97-ความลับใน-db)) |

## 12. Checklist

**ทุก PR**

- [ ] API ใหม่หรือที่แก้ `select` เฉพาะฟิลด์ที่หน้าจอใช้ และ mask ตามสิทธิ์ผู้ดู
- [ ] ไม่มีข้อมูลส่วนบุคคลใน URL หรือ query string
- [ ] log / alert ใหม่ผ่าน `maskObject` หรือ `pseudonymize` และไม่มีค่าดิบ
- [ ] catch block ไม่ส่ง error ดิบออกนอกระบบ (ใช้ `serializeError` / `scrubText`)
- [ ] ความลับใหม่ (token, code, key) เก็บเป็น hash
- [ ] ฟิลด์ PII ใหม่ถูกเพิ่มลงใน `DEFAULT_POLICY` และบัญชีข้อมูลแล้ว
- [ ] export ใหม่มีสิทธิ์, จำกัดแถว และ audit

**ก่อนขึ้น production**

- [ ] unit test และ canary test ผ่าน
- [ ] `PII_HMAC_KEY` / `OTP_HMAC_KEY` / `FIELD_*` ตั้งใน secret manager และไม่ซ้ำกับ session secret
- [ ] port ของ DB และ service ภายในไม่เปิดออกอินเทอร์เน็ต
- [ ] backup เข้ารหัส และกำหนดคนเข้าถึงได้
- [ ] กำหนดอายุการเก็บ log แล้ว
- [ ] DB นอก production เป็นสำเนาที่ mask แล้ว

## 13. PDPA ที่เกี่ยวข้อง

| มาตรา | เรื่อง | เกี่ยวกับ masking อย่างไร |
|---|---|---|
| 22 | เก็บเท่าที่จำเป็นตามวัตถุประสงค์ | ไม่เก็บและไม่ log สิ่งที่ไม่ได้ใช้ |
| 26 | ข้อมูลอ่อนไหว (เชื้อชาติ, ศาสนา, สุขภาพ, ข้อมูลชีวภาพ, ประวัติอาชญากรรม ฯลฯ) | ห้ามเข้า log / alert · พิจารณาเข้ารหัสในตาราง |
| 28–29 | ส่งข้อมูลไปต่างประเทศ | Slack, Discord, Sentry และ LLM ได้แค่ ID หรือ pseudonym |
| 37(1) | มาตรการรักษาความมั่นคงปลอดภัย | masking, encryption และการคุมสิทธิ์เป็นส่วนหนึ่งของมาตรการ |
| 37(4) | แจ้งเหตุละเมิดภายใน 72 ชั่วโมง | log ที่ mask แล้วช่วยจำกัดขอบเขตของเหตุละเมิด |
