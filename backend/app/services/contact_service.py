import logging
import re
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import Contact

logger = logging.getLogger(__name__)


def clean_phone_number(raw_phone: str) -> str:
    """
    Cleans a phone number for display and storage.
    Preserves leading '+' if present, strips spaces, parentheses, hyphens, and dots.
    """
    if not raw_phone:
        return ""
    cleaned = re.sub(r"[^\d+]", "", raw_phone.strip())
    return cleaned


def to_whatsapp_digits(phone: str) -> str:
    """
    Converts a phone number into pure digits for WhatsApp Click-to-Chat (wa.me/{digits}).
    wa.me requires international phone format without '+' or special symbols.
    """
    digits = re.sub(r"\D", "", phone or "")
    # If number starts with 00, strip 00
    if digits.startswith("00"):
        digits = digits[2:]
    return digits


def is_valid_phone(phone: str) -> bool:
    """Validates that a phone string has between 7 and 15 digits."""
    digits = to_whatsapp_digits(phone)
    return 7 <= len(digits) <= 15


def find_contact(
    identifier: str,
    db: Session,
    user_id: Optional[str] = None,
) -> Tuple[Optional[Contact], List[Contact]]:
    """
    Finds a contact by name, alias, or relationship.
    Returns (primary_match, all_candidates).
    """
    raw = (identifier or "").strip()
    if not raw:
        return None, []

    # Strip conversational noise: "my friend", "my lecturer", "friend", "to", etc.
    cleaned = re.sub(r"^(?:my\s+|to\s+)", "", raw, flags=re.IGNORECASE).strip()
    lower = cleaned.lower()

    query = db.query(Contact)
    if user_id:
        query = query.filter((Contact.user_id == user_id) | (Contact.user_id.is_(None)))

    all_contacts = query.all()

    # 1. Exact Name match (case-insensitive)
    for c in all_contacts:
        if c.name.strip().lower() == lower:
            return c, [c]

    # 2. Relationship match (e.g. "friend", "lecturer", "colleague")
    relation_matches = [
        c for c in all_contacts
        if c.relationship and c.relationship.strip().lower() == lower
    ]
    if len(relation_matches) == 1:
        return relation_matches[0], relation_matches

    # 3. Substring name match
    name_matches = [
        c for c in all_contacts
        if lower in c.name.strip().lower() or c.name.strip().lower() in lower
    ]
    if len(name_matches) == 1:
        return name_matches[0], name_matches

    candidates = list({c.id: c for c in (relation_matches + name_matches)}.values())
    primary = candidates[0] if len(candidates) == 1 else None
    return primary, candidates
