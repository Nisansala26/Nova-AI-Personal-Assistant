import logging
import re
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import Task

logger = logging.getLogger(__name__)


def format_due_string(when: str) -> str:
    """
    Normalizes conversational time expressions like 'tomorrow at 8 pm' to 'Tomorrow at 8:00 PM'.
    """
    w = when.strip()
    # Normalize: "tomorrow at 8 pm" / "tomorrow at 8:30 am"
    m = re.match(r"^(tomorrow|today|tonight)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)$", w, re.IGNORECASE)
    if m:
        period = m.group(1).capitalize()
        hh = int(m.group(2))
        mm = m.group(3) or "00"
        ampm = m.group(4).upper()
        return f"{period} at {hh}:{mm} {ampm}"

    # Normalize: "at 8 pm"
    m_at = re.match(r"^at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)$", w, re.IGNORECASE)
    if m_at:
        hh = int(m_at.group(1))
        mm = m_at.group(2) or "00"
        ampm = m_at.group(3).upper()
        return f"Today at {hh}:{mm} {ampm}"

    return w.capitalize()


def parse_reminder_command(raw_command: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Extracts (is_reminder, title, due_time) from voice or typed commands.
    Examples:
      - "remind me tomorrow at 8 PM to study Java"
      - "remind me to study Java tomorrow at 8 PM"
      - "remind me at 8 PM to submit report"
      - "set a reminder to study Java tomorrow"
    """
    raw = (raw_command or "").strip()
    if not raw:
        return False, None, None

    # Strip wake prefixes
    cleaned = re.sub(
        r"^(?:(?:hey|hi|hello|ok|okay)?\s*nova\b|please\b)[,\s:]*",
        "",
        raw,
        flags=re.IGNORECASE,
    ).strip(" '\"`?.!,:;")
    text = cleaned.lower()

    if not (text.startswith("remind me") or text.startswith("set a reminder") or text.startswith("set reminder")):
        return False, None, None

    # Pattern A: "remind me tomorrow at 8 PM to study Java" / "remind me tomorrow to study Java"
    mA = re.match(
        r"^remind\s+me\s+(?P<when>(?:tomorrow|today|tonight|next\s+\w+|\w+day)(?:\s+at\s+[\d:\s]+(?:am|pm)?)?|at\s+[\d:\s]+(?:am|pm)?)\s+to\s+(?P<title>.+)$",
        cleaned,
        re.IGNORECASE,
    )
    if mA:
        when = mA.group("when").strip()
        title = mA.group("title").strip(" '\"`?.!,:;")
        return True, title, format_due_string(when)

    # Pattern B: "remind me to study Java tomorrow at 8 PM" / "remind me to study Java by tomorrow"
    mB = re.match(
        r"^remind\s+me\s+to\s+(?P<title>.+?)\s+(?P<when>(?:tomorrow|today|tonight|next\s+\w+|\w+day)(?:\s+at\s+[\d:\s]+(?:am|pm)?)?|at\s+[\d:\s]+(?:am|pm)?|by\s+.+)$",
        cleaned,
        re.IGNORECASE,
    )
    if mB:
        title = mB.group("title").strip(" '\"`?.!,:;")
        when = mB.group("when").strip()
        return True, title, format_due_string(when)

    # Pattern C: "remind me to study Java"
    mC = re.match(r"^remind\s+me\s+to\s+(?P<title>.+)$", cleaned, re.IGNORECASE)
    if mC:
        title = mC.group("title").strip(" '\"`?.!,:;")
        return True, title, "Today"

    # Pattern D: "set a reminder to study Java tomorrow at 8 PM"
    mD = re.match(
        r"^(?:set\s+(?:a\s+)?reminder\s+(?:to\s+|for\s+|:\s*))(?P<rest>.+)$",
        cleaned,
        re.IGNORECASE,
    )
    if mD:
        rest = mD.group("rest").strip()
        m_sub = re.search(
            r"\s+(?P<when>(?:tomorrow|today|tonight|at\s+[\d:\s]+(?:am|pm)?).*)$",
            rest,
            re.IGNORECASE,
        )
        if m_sub:
            title = rest[:m_sub.start()].strip()
            when = m_sub.group("when").strip()
            return True, title, format_due_string(when)
        return True, rest, "Today"

    return False, None, None


def create_reminder_task(
    title: str,
    due_time: str,
    db: Session,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Creates a Task in SQLite with category='Reminder' and priority='high'.
    """
    clean_title = (title or "Reminder").strip()[:300]
    clean_due = (due_time or "Today").strip()[:50]

    task = Task(
        user_id=user_id,
        title=f"Reminder: {clean_title}",
        category="Reminder",
        priority="high",
        due_date=clean_due,
        completed=False,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    reply_msg = f'Reminder set for {clean_due}: "{clean_title}".'
    return {
        "reply": reply_msg,
        "response": reply_msg,
        "action": {
            "type": "reminder_created",
            "task_id": task.id,
            "title": clean_title,
            "due_date": clean_due,
            "priority": "high",
        },
        "task_id": task.id,
        "title": clean_title,
        "due_date": clean_due,
        "url": None,
        "target": "reminder",
    }
