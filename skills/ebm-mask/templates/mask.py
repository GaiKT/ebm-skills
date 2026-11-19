# mask.py
"""Central data-masking helpers: Python twin of lib/mask.ts, keep the rules identical."""
from __future__ import annotations

import hashlib
import hmac
import os
import re
from collections.abc import Mapping
from typing import Any

REDACTED = "[REDACTED]"
VISIBLE_TAIL = 4  # same tail everywhere, so two partial views never combine into the full value
MIN_LENGTH_TO_REVEAL = 8  # below this, 4 visible characters give away half the value or more
FIXED_MASK = "***"  # fixed width where the real length would itself leak information
MAX_DEPTH = 8  # guards against cyclic or very deep structures


def _to_text(value: Any) -> str | None:
    return None if value is None else str(value).strip()


def mask_tail(value: Any) -> str | None:
    """Keep only the last 4 characters; values shorter than 8 are hidden completely.

    Args:
        value: Any value, converted with str(); None stays None.
    """
    text = _to_text(value)
    if not text:
        return text
    if len(text) < MIN_LENGTH_TO_REVEAL:
        return FIXED_MASK
    return "*" * (len(text) - VISIBLE_TAIL) + text[-VISIBLE_TAIL:]


def mask_thai_id(value: Any) -> str | None:
    """Thai national ID / tax ID -> ``*********0121`` (digits 2-5 reveal the issuing district).

    Args:
        value: ID with or without dashes / spaces.
    """
    text = _to_text(value)
    return mask_tail(re.sub(r"[\s-]", "", text)) if text else text


def mask_phone(value: Any) -> str | None:
    """Phone -> digits only, last 4 visible. Works for 0x and +66 forms.

    Args:
        value: Phone number in any format.
    """
    text = _to_text(value)
    if not text:
        return text
    digits = re.sub(r"\D", "", text)
    return mask_tail(digits) if digits else FIXED_MASK


def mask_email(value: Any) -> str | None:
    """Email -> ``so***@example.com``; local parts of 4 characters or fewer are hidden whole.

    Args:
        value: Email address; anything without a usable "@" falls back to mask_tail.
    """
    text = _to_text(value)
    if not text:
        return text
    at = text.rfind("@")
    if at <= 0 or at == len(text) - 1:
        return mask_tail(text)
    local = text[:at]
    head = local[:2] if len(local) > 4 else ""
    return f"{head}{FIXED_MASK}@{text[at + 1:].lower()}"


def mask_name(value: Any) -> str | None:
    """Name -> first character of each word. In logs, prefer the user ID over any name.

    Args:
        value: Full name; words are split on whitespace.
    """
    text = _to_text(value)
    if not text:
        return text
    return " ".join(f"{word[0]}{FIXED_MASK}" for word in text.split())


def _normalize_key(key: str) -> str:
    # taxId / tax_id / TAX-ID must all hit the same policy entry.
    return re.sub(r"[_\-.\s]", "", key.lower())


# Substring match only for long, unambiguous words; short words are exact-match,
# otherwise "shipping" would hit "pin" and "notpaid" would hit "otp".
SECRET_SUBSTRINGS = ("password", "passwd", "secret", "token", "apikey", "authorization", "cookie", "privatekey")
SECRET_EXACT = frozenset({"otp", "otpcode", "pin", "pincode", "cvv", "cvc"})

DEFAULT_POLICY: Mapping[str, str] = {
    "email": "email",
    "phone": "phone", "mobile": "phone", "tel": "phone", "phonenumber": "phone", "mobilephone": "phone",
    "taxid": "thaiId", "idcard": "thaiId", "citizenid": "thaiId", "nationalid": "thaiId",
    "passport": "tail", "passportno": "tail", "bankaccount": "tail", "accountno": "tail",
    "firstname": "name", "lastname": "name", "fullname": "name",
    "address": "redact", "birthdate": "redact", "dob": "redact",
}

_MASKERS = {"email": mask_email, "phone": mask_phone, "thaiId": mask_thai_id, "name": mask_name, "tail": mask_tail}
_CONTAINERS = (Mapping, list, tuple, set, frozenset)


def _rule_for(key: str, policy: Mapping[str, str]) -> str | None:
    k = _normalize_key(key)
    if k in SECRET_EXACT or any(word in k for word in SECRET_SUBSTRINGS):
        return "redact"
    return policy.get(k)


def _apply_rule(rule: str, value: Any) -> Any:
    if value is None:
        return None
    # A structured value under a PII key (e.g. address: {...}) is dropped whole.
    if rule == "redact" or isinstance(value, _CONTAINERS):
        return REDACTED
    return _MASKERS.get(rule, mask_tail)(value)


def mask_object(value: Any, policy: Mapping[str, str] = DEFAULT_POLICY) -> Any:
    """Return a deep copy with fields masked or redacted by key name; the input is not modified.

    Args:
        value: dict / list / scalar to mask, e.g. a log payload or a pydantic ``model_dump()``.
        policy: Normalized key -> rule; extend with ``{**DEFAULT_POLICY, "guardianphone": "phone"}``.
    """

    def walk(node: Any, depth: int, ancestors: frozenset[int]) -> Any:
        if isinstance(node, (bytes, bytearray)):
            return "[Binary]"
        if not isinstance(node, _CONTAINERS):
            return node
        if depth >= MAX_DEPTH or id(node) in ancestors:
            return "[Truncated]"
        inner = ancestors | {id(node)}
        if isinstance(node, Mapping):
            result = {}
            for key, val in node.items():
                rule = _rule_for(str(key), policy)
                result[key] = _apply_rule(rule, val) if rule else walk(val, depth + 1, inner)
            return result
        return [walk(item, depth + 1, inner) for item in node]

    return walk(value, 0, frozenset())


_JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")
_AUTH_HEADER_RE = re.compile(r"\b(Bearer|Basic)\s+[A-Za-z0-9\-._~+/=]+", re.IGNORECASE)
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
# 13 digits, optionally written 1-2345-67890-12-1; millisecond timestamps also match (accepted).
_THAI_ID_RE = re.compile(r"(?<!\d)\d[- ]?\d{4}[- ]?\d{5}[- ]?\d{2}[- ]?\d(?!\d)")
_PHONE_RE = re.compile(r"(?<![\d*])(?:\+66[- ]?|0)\d{1,2}[- ]?\d{3}[- ]?\d{3,4}(?!\d)")


def scrub_text(text: str) -> str:
    """Last-resort scrub for unstructured text (error messages, tracebacks, ORM errors).

    Pattern matching can never be complete: mask structured data with mask_object first.

    Args:
        text: Free text that may contain personal data or credentials.
    """
    text = _JWT_RE.sub(REDACTED, text)
    text = _AUTH_HEADER_RE.sub(lambda m: f"{m.group(1)} {REDACTED}", text)
    text = _EMAIL_RE.sub(lambda m: mask_email(m.group(0)) or FIXED_MASK, text)
    text = _THAI_ID_RE.sub(lambda m: mask_thai_id(m.group(0)) or FIXED_MASK, text)
    return _PHONE_RE.sub(lambda m: mask_phone(m.group(0)) or FIXED_MASK, text)


def pseudonymize(value: Any, purpose: str) -> str | None:
    """Keyed hash for correlating one person across logs without storing the value.

    Plain SHA-256 is not safe here: a Thai ID has ~10^12 possible values and a phone ~10^9,
    both brute-forced in minutes on a GPU. Without the key the HMAC cannot be reversed.

    Args:
        value: Already normalized (digits only for phone/ID); it is lowercased here.
        purpose: Context label such as "login"; the same value hashes differently per purpose.

    Raises:
        RuntimeError: If PII_HMAC_KEY is missing or shorter than 32 characters.
    """
    text = _to_text(value)
    if not text:
        return None
    key = os.environ.get("PII_HMAC_KEY", "")
    if len(key) < 32:
        raise RuntimeError("PII_HMAC_KEY must be set (>= 32 characters)")
    digest = hmac.new(key.encode(), f"{purpose}\0{text.lower()}".encode(), hashlib.sha256).hexdigest()
    return f"v1:{digest[:16]}"  # 64 bits is plenty for correlation; "v1" marks the key generation
