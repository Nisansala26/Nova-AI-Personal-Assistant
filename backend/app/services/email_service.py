import logging
import re
from typing import Any, Dict, Optional, Tuple
from urllib.parse import quote_plus
from sqlalchemy.orm import Session

from app.services.ai_service import ask_ai
from app.services.contact_service import find_contact

logger = logging.getLogger(__name__)


def parse_email_command(command: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Detects email drafting commands.
    Returns: (is_email_cmd, recipient_name_or_role, topic_or_request)
    """
    raw = command.strip()
    if not raw:
        return False, None, None

    cleaned = re.sub(
        r"^(?:(?:hey|hi|hello|ok|okay)?\s*nova\b|please\b)[,\s:]*",
        "",
        raw,
        flags=re.IGNORECASE,
    ).strip()
    text = cleaned.lower()

    if not ("email" in text or "draft a mail" in text or "send mail" in text):
        return False, None, None

    # Pattern 1: "draft an email to my lecturer" / "write an email to Dr. Smith requesting..."
    m1 = re.match(
        r"^(?:draft|write|prepare|compose)\s+(?:an?\s+)?email\s+(?:to\s+)?(?P<rec>[^,\s]+(?:\s+[^,\s]+)?)\s+(?:about|regarding|saying|requesting|for)\s+(?P<topic>.+)$",
        cleaned,
        re.IGNORECASE,
    )
    if m1:
        return True, m1.group("rec").strip(" '\"`?.!,:;"), m1.group("topic").strip(" '\"`?.!,:;")

    # Pattern 2: "draft an email to my lecturer" / "write an email to Dr. Smith"
    m2 = re.match(
        r"^(?:draft|write|prepare|compose)\s+(?:an?\s+)?email\s+(?:to\s+)(?P<rec>.+?)[\s.?!]*$",
        cleaned,
        re.IGNORECASE,
    )
    if m2:
        return True, m2.group("rec").strip(" '\"`?.!,:;"), "General correspondence"

    # Pattern 3: "write an email requesting an internship" / "prepare an email saying I cannot attend tomorrow"
    m3 = re.match(
        r"^(?:draft|write|prepare|compose)\s+(?:an?\s+)?email\s+(?P<topic>(?:requesting|saying|about|regarding|for|to\s+ask)\s+.+)[\s.?!]*$",
        cleaned,
        re.IGNORECASE,
    )
    if m3:
        return True, None, m3.group("topic").strip(" '\"`?.!,:;")

    # Pattern 4: "draft email: [topic]" / "email [topic]"
    m4 = re.match(
        r"^(?:draft|compose)\s+email(?:\s*[:\-]\s*|\s+)(?P<topic>.+)$",
        cleaned,
        re.IGNORECASE,
    )
    if m4:
        return True, None, m4.group("topic").strip(" '\"`?.!,:;")

    return False, None, None


async def generate_email_draft(
    recipient_hint: Optional[str],
    topic: str,
    db: Session,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Uses Groq LLM to synthesize a professional email draft and builds client URLs.
    """
    recipient_email = ""
    recipient_display = recipient_hint or "Recipient"

    # Try looking up contact in database
    if recipient_hint:
        contact, _ = find_contact(recipient_hint, db, user_id=user_id)
        if contact:
            recipient_display = contact.name
            if contact.email:
                recipient_email = contact.email

    prompt = (
        f"You are an executive AI assistant drafting a professional email.\n"
        f"Recipient: {recipient_display}\n"
        f"Purpose / Context: {topic}\n\n"
        f"Format your response EXACTLY as follows with no commentary:\n"
        f"SUBJECT: [Short, clear subject line]\n"
        f"BODY:\n"
        f"[Professional email body with appropriate salutation and closing]"
    )

    try:
        raw_draft = await ask_ai(prompt, conversation_history=(), system_extra="Generate concise, polite business emails.")
        # Parse SUBJECT and BODY
        subject = f"Regarding {topic[:40]}"
        body = raw_draft

        if "SUBJECT:" in raw_draft and "BODY:" in raw_draft:
            parts = raw_draft.split("BODY:", 1)
            subject_line = parts[0].replace("SUBJECT:", "").strip()
            if subject_line:
                subject = subject_line
            body = parts[1].strip()
        elif "SUBJECT:" in raw_draft:
            lines = raw_draft.splitlines()
            for line in lines:
                if line.startswith("SUBJECT:"):
                    subject = line.replace("SUBJECT:", "").strip()
                    break
    except Exception as e:
        logger.error(f"Error generating email draft: {e}")
        subject = f"Notice: {topic[:50]}"
        body = f"Dear {recipient_display},\n\nI am writing to you regarding {topic}.\n\nPlease let me know if you need any additional details.\n\nBest regards,\n[Your Name]"

    # Build mailto and Gmail Web compose links
    encoded_sub = quote_plus(subject)
    encoded_body = quote_plus(body)
    mailto_url = f"mailto:{recipient_email}?subject={encoded_sub}&body={encoded_body}"
    gmail_url = f"https://mail.google.com/mail/?view=cm&fs=1&to={quote_plus(recipient_email)}&su={encoded_sub}&body={encoded_body}"

    reply_msg = (
        f"I've drafted an email to {recipient_display} regarding '{subject}'. "
        "You can review and edit it below before opening your mail client."
    )

    return {
        "reply": reply_msg,
        "response": reply_msg,
        "action": {
            "type": "email_draft",
            "recipient": recipient_email,
            "recipient_name": recipient_display,
            "subject": subject,
            "body": body,
            "mailto_url": mailto_url,
            "web_url": gmail_url,
            "requires_confirmation": True,
        },
        "subject": subject,
        "url": gmail_url,
        "target": "email",
    }
