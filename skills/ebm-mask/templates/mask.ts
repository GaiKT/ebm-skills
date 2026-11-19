// lib/mask.ts
/**
 * Central data-masking helpers.
 * Every log line, alert, export and API response that hides personal data goes through
 * this module, so the reveal rule (last 4 characters) is identical everywhere.
 */
import { createHmac } from 'node:crypto'

export const REDACTED = '[REDACTED]'
export type MaskRule = 'redact' | 'email' | 'phone' | 'thaiId' | 'tail' | 'name'
export type MaskPolicy = Readonly<Record<string, MaskRule>>

// Same tail everywhere: if one screen showed the head and another the tail,
// the two partial views would combine into the full value.
const VISIBLE_TAIL = 4
// Below 8 characters, showing 4 gives away half the value or more, so hide it all.
const MIN_LENGTH_TO_REVEAL = 8
// Fixed width where the real length would itself leak information (short values, email local part).
const FIXED_MASK = '***'
// Guards against cyclic or very deep objects (ORM entities, request objects).
const MAX_DEPTH = 8

function toText(value: unknown): string | null {
    if (value === null || value === undefined) return null
    return String(value).trim()
}

/** Keeps only the last 4 characters; values shorter than 8 are hidden completely. */
export function maskTail(value: unknown): string | null {
    const text = toText(value)
    if (!text) return text
    if (text.length < MIN_LENGTH_TO_REVEAL) return FIXED_MASK
    return '*'.repeat(text.length - VISIBLE_TAIL) + text.slice(-VISIBLE_TAIL)
}

/**
 * Thai national ID / tax ID -> `*********0121`.
 * The head is never shown: digits 2-5 encode the province/district that issued the ID.
 */
export function maskThaiId(value: unknown): string | null {
    const text = toText(value)
    return text ? maskTail(text.replace(/[\s-]/g, '')) : text
}

/** Phone -> digits only, last 4 visible (`******5678`). Works for 0x and +66 forms. */
export function maskPhone(value: unknown): string | null {
    const text = toText(value)
    if (!text) return text
    const digits = text.replace(/\D/g, '')
    return digits ? maskTail(digits) : FIXED_MASK
}

/**
 * Email -> `so***@example.com`. The 2 leading characters are shown only when the local part
 * is longer than 4; the domain stays visible so staff can tell accounts apart.
 */
export function maskEmail(value: unknown): string | null {
    const text = toText(value)
    if (!text) return text
    const at = text.lastIndexOf('@')
    if (at <= 0 || at === text.length - 1) return maskTail(text)
    const local = text.slice(0, at)
    const head = local.length > 4 ? local.slice(0, 2) : ''
    return `${head}${FIXED_MASK}@${text.slice(at + 1).toLowerCase()}`
}

/** Name -> first character of each word (`ส*** ใ***`). In logs, prefer the user ID over any name. */
export function maskName(value: unknown): string | null {
    const text = toText(value)
    if (!text) return text
    return text
        .split(/\s+/)
        .map((word) => `${Array.from(word)[0]}${FIXED_MASK}`)
        .join(' ')
}

// Keys are compared after lowercasing and dropping _ - . and spaces, so taxId / tax_id / TAX-ID match.
const normalizeKey = (key: string) => key.toLowerCase().replace(/[_\-.\s]/g, '')

// Substring match only for long, unambiguous words. Short words are exact-match only,
// otherwise "shipping" would hit "pin" and "notpaid" would hit "otp".
const SECRET_SUBSTRINGS = ['password', 'passwd', 'secret', 'token', 'apikey', 'authorization', 'cookie', 'privatekey']
const SECRET_EXACT = new Set(['otp', 'otpcode', 'pin', 'pincode', 'cvv', 'cvc'])

/** Default field policy (normalized keys). Extend per project: `{ ...DEFAULT_POLICY, guardianphone: 'phone' }`. */
export const DEFAULT_POLICY: MaskPolicy = {
    email: 'email',
    phone: 'phone', mobile: 'phone', tel: 'phone', phonenumber: 'phone', mobilephone: 'phone',
    taxid: 'thaiId', idcard: 'thaiId', citizenid: 'thaiId', nationalid: 'thaiId',
    passport: 'tail', passportno: 'tail', bankaccount: 'tail', accountno: 'tail',
    firstname: 'name', lastname: 'name', fullname: 'name',
    address: 'redact', birthdate: 'redact', dob: 'redact',
}

function ruleFor(key: string, policy: MaskPolicy): MaskRule | undefined {
    const k = normalizeKey(key)
    if (SECRET_EXACT.has(k) || SECRET_SUBSTRINGS.some((word) => k.includes(word))) return 'redact'
    return policy[k]
}

function applyRule(rule: MaskRule, value: unknown): unknown {
    if (value === null || value === undefined) return value
    // A structured value under a PII key (e.g. address: {...}) is dropped whole.
    if (rule === 'redact' || typeof value === 'object') return REDACTED
    switch (rule) {
        case 'email': return maskEmail(value)
        case 'phone': return maskPhone(value)
        case 'thaiId': return maskThaiId(value)
        case 'name': return maskName(value)
        default: return maskTail(value)
    }
}

/**
 * Returns a deep copy with fields masked or redacted by key name; the input is never modified.
 * Use on anything that leaves the process: log payloads, alert details, audit old/new values.
 * Class instances (Error, Map, ORM Decimal) come back as plain objects, so serialize errors
 * with serializeError() and convert entities to plain data first.
 */
export function maskObject<T>(value: T, policy: MaskPolicy = DEFAULT_POLICY): T {
    const ancestors = new WeakSet<object>()
    const walk = (node: unknown, depth: number): unknown => {
        if (node === null || typeof node !== 'object') return node
        if (node instanceof Date) return node
        if (ArrayBuffer.isView(node)) return '[Binary]'
        if (depth >= MAX_DEPTH || ancestors.has(node)) return '[Truncated]'
        ancestors.add(node)
        const out = Array.isArray(node)
            ? node.map((item) => walk(item, depth + 1))
            : Object.fromEntries(
                  Object.entries(node).map(([key, val]) => {
                      const rule = ruleFor(key, policy)
                      return [key, rule ? applyRule(rule, val) : walk(val, depth + 1)]
                  }),
              )
        ancestors.delete(node)
        return out
    }
    return walk(value, 0) as T
}

const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g
const AUTH_HEADER_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9\-._~+/=]+/gi
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g
// 13 digits, optionally written 1-2345-67890-12-1. Millisecond timestamps also match;
// masking them in error text is an accepted false positive.
const THAI_ID_RE = /(?<!\d)\d[- ]?\d{4}[- ]?\d{5}[- ]?\d{2}[- ]?\d(?!\d)/g
// Thai mobile / landline in local (0x) or international (+66) form.
const PHONE_RE = /(?<![\d*])(?:\+66[- ]?|0)\d{1,2}[- ]?\d{3}[- ]?\d{3,4}(?!\d)/g

/**
 * Last-resort scrub for unstructured text: error messages, stack traces, ORM errors that
 * print query arguments. Pattern matching can never be complete, so mask structured data
 * with maskObject first; this only catches what slipped through.
 */
export function scrubText(text: string): string {
    return text
        .replace(JWT_RE, REDACTED)
        .replace(AUTH_HEADER_RE, (_match, scheme: string) => `${scheme} ${REDACTED}`)
        .replace(EMAIL_RE, (match) => maskEmail(match) ?? FIXED_MASK)
        .replace(THAI_ID_RE, (match) => maskThaiId(match) ?? FIXED_MASK)
        .replace(PHONE_RE, (match) => maskPhone(match) ?? FIXED_MASK)
}

/**
 * Keyed hash for correlating one person across logs without storing the value.
 * Plain SHA-256 is not safe here: a Thai ID has ~10^12 possible values and a phone ~10^9,
 * both brute-forced in minutes on a GPU. Without the key the HMAC cannot be reversed.
 * @param value already normalized (digits only for phone/ID); it is lowercased here
 * @param purpose context label such as 'login'; the same value hashes differently per purpose
 * @throws Error when PII_HMAC_KEY is missing or shorter than 32 characters
 */
export function pseudonymize(value: unknown, purpose: string): string | null {
    const text = toText(value)
    if (!text) return null
    const key = process.env.PII_HMAC_KEY
    if (!key || key.length < 32) throw new Error('PII_HMAC_KEY must be set (>= 32 characters)')
    const digest = createHmac('sha256', key).update(`${purpose}\u0000${text.toLowerCase()}`).digest('hex')
    // 16 hex chars (64 bits) is plenty for correlation; "v1" marks the key generation for rotation.
    return `v1:${digest.slice(0, 16)}`
}
