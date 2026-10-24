import logging
import re
from typing import Any, Dict, Optional, Tuple
from urllib.parse import quote_plus
from sqlalchemy.orm import Session

from app.services.contact_service import find_contact, to_whatsapp_digits

logger = logging.getLogger(__name__)


def parse_whatsapp_command(
    command: str,
    db: Session,
    user_id: Optional[str] = None,
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Parses WhatsApp voice & text commands.
    Supported patterns:
      - "open whatsapp" / "launch whatsapp"
      - "open my whatsapp conversation with [recipient]"
      - "send [recipient] a message saying [message]"
      - "message [recipient] saying/that [message]"
      - "prepare a whatsapp message to [recipient] saying [message]"
      - "send whatsapp message to [recipient]: [message]"
    """
    raw = command.strip()
    if not raw:
        return False, None

    # Strip wake prefixes and polite greetings
    cleaned = re.sub(
        r"^(?:(?:hey|hi|hello|ok|okay)?\s*nova\b|please\b)[,\s:]*",
        "",
        raw,
        flags=re.IGNORECASE,
    ).strip()
    text = cleaned.lower()

    if not ("whatsapp" in text or text.startswith("message ") or "send a message" in text or "send message" in text):
        return False, None

    # 1. Simple open WhatsApp
    if re.match(r"^(?:open|launch|go\s+to)?\s*whatsapp[\s.?!]*$", cleaned, re.IGNORECASE):
        reply_msg = "Opening WhatsApp Web. You can also use the desktop app."
        return True, {
            "reply": reply_msg,
            "response": reply_msg,
            "action": {
                "type": "open_url",
                "url": "https://web.whatsapp.com",
                "app_url": "whatsapp://",
                "title": "WhatsApp Web",
            },
            "url": "https://web.whatsapp.com",
            "target": "whatsapp",
        }

    # 2. Open conversation with recipient: "open my whatsapp conversation with Devni"
    open_conv_m = re.match(
        r"^(?:open\s+(?:my\s+)?whatsapp\s+conversation\s+with\s+|chat\s+with\s+)(?P<rec>.+?)[\s.?!]*$",
        cleaned,
        re.IGNORECASE,
    )
    if open_conv_m:
        rec_name = open_conv_m.group("rec").strip(" '\"`?.!,:;")
        contact, candidates = find_contact(rec_name, db, user_id=user_id)
        if contact and contact.phone:
            digits = to_whatsapp_digits(contact.phone)
            url = f"https://wa.me/{digits}"
            reply_msg = f"Opening your WhatsApp conversation with {contact.name} ({contact.phone})."
            return True, {
                "reply": reply_msg,
                "response": reply_msg,
                "action": {
                    "type": "open_url",
                    "url": url,
                    "app_url": f"whatsapp://send?phone={digits}",
                    "title": f"WhatsApp with {contact.name}",
                },
                "url": url,
                "target": "whatsapp",
            }
        else:
            reply_msg = f"Contact '{rec_name}' was not found in your Contacts directory. Please add their phone number first."
            return True, {
                "reply": reply_msg,
                "response": reply_msg,
                "action": {
                    "type": "contact_missing",
                    "recipient": rec_name,
                },
                "url": None,
                "target": "whatsapp",
            }

    # 3. Message sending & preparation patterns:
    # "send Devni a message saying I'm fine"
    # "prepare a WhatsApp message to Devni saying I'm fine"
    # "message my friend that I'll call later"
    # "send WhatsApp message to Devni: I'll be late"
    patterns = [
        # "prepare a whatsapp message to Devni saying I'm fine"
        r"^(?:prepare\s+(?:a\s+)?whatsapp\s+message\s+(?:to\s+)?)(?P<rec>.+?)\s+(?:saying|that|with\s+text)\s+(?P<msg>.+)$",
        # "send Devni a message saying I'm fine"
        r"^(?:send\s+)(?P<rec>.+?)\s+(?:a\s+message\s+(?:on\s+whatsapp\s+)?(?:saying|that)\s+)(?P<msg>.+)$",
        # "message my friend that I'll call later" / "message Devni saying I'm fine"
        r"^(?:message\s+)(?P<rec>.+?)\s+(?:saying|that|with)\s+(?P<msg>.+)$",
        # "send whatsapp message to Devni: I'm fine"
        r"^(?:send\s+)?whatsapp\s+(?:message\s+)?(?:to\s+)?(?P<rec>.+?)(?:\s*[:\-]\s*|\s+saying\s+)(?P<msg>.+)$",
        # "text Devni saying I'm fine"
        r"^(?:text\s+)(?P<rec>.+?)\s+(?:saying|that)\s+(?P<msg>.+)$",
    ]

    for pat in patterns:
        match = re.match(pat, cleaned, re.IGNORECASE)
        if match:
            rec_raw = match.group("rec").strip(" '\"`?.!,:;")
            msg_raw = match.group("msg").strip(" '\"`").rstrip(".!?")
            if rec_raw and msg_raw:
                contact, candidates = find_contact(rec_raw, db, user_id=user_id)
                if contact and contact.phone:
                    digits = to_whatsapp_digits(contact.phone)
                    enc_text = quote_plus(msg_raw)
                    wa_url = f"https://wa.me/{digits}?text={enc_text}"
                    app_url = f"whatsapp://send?phone={digits}&text={enc_text}"
                    reply_msg = (
                        f"Prepared WhatsApp message to {contact.name} ({contact.phone}): \"{msg_raw}\". "
                        "Click below to review and send in WhatsApp."
                    )
                    return True, {
                        "reply": reply_msg,
                        "response": reply_msg,
                        "action": {
                            "type": "whatsapp_prepare",
                            "recipient_name": contact.name,
                            "phone": contact.phone,
                            "digits": digits,
                            "message": msg_raw,
                            "url": wa_url,
                            "app_url": app_url,
                            "requires_confirmation": True,
                        },
                        "url": wa_url,
                        "target": "whatsapp",
                    }
                elif candidates and len(candidates) > 1:
                    names_str = ", ".join(f"{c.name} ({c.relationship or 'contact'})" for c in candidates)
                    clarify_msg = f"Found multiple matching contacts: {names_str}. Which one would you like to message?"
                    return True, {
                        "reply": clarify_msg,
                        "response": clarify_msg,
                        "action": {
                            "type": "clarification_needed",
                            "candidates": [c.name for c in candidates],
                        },
                        "url": None,
                        "target": "whatsapp",
                    }
                else:
                    missing_msg = (
                        f"Contact '{rec_raw}' was not found in your Contacts directory. "
                        "Please add their phone number in Contacts or specify their number."
                    )
                    return True, {
                        "reply": missing_msg,
                        "response": missing_msg,
                        "action": {
                            "type": "contact_missing",
                            "recipient": rec_raw,
                            "message": msg_raw,
                        },
                        "url": None,
                        "target": "whatsapp",
                    }

    return False, None
