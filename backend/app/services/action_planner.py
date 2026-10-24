import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote_plus
from sqlalchemy.orm import Session

from app.services.desktop_service import create_and_open_note
from app.services.reminder_service import create_reminder_task, format_due_string
from app.services.website_service import parse_website_command

logger = logging.getLogger(__name__)


def decompose_compound_command(command: str) -> Optional[List[str]]:
    """
    Decomposes compound sentences joined by coordination conjunctions:
    e.g. 'search YouTube for Python tutorials, save the search link in Notepad, and remind me tomorrow'
    or 'search for Python tutorials and save the search link'
    """
    raw = (command or "").strip()
    if not raw:
        return None

    cleaned = re.sub(
        r"^(?:(?:hey|hi|hello|ok|okay)?\s*nova\b|please\b)[,\s:]*",
        "",
        raw,
        flags=re.IGNORECASE,
    ).strip(" '\"`?.!,:;")

    # Guard against single website search expressions like "Open YouTube and search for Java programming"
    if re.match(r"^(?:open|go\s+to|launch)\s+\w+\s+(?:and|to)\s+(?:search|find|look)", cleaned, re.IGNORECASE):
        return None

    # Check if there is an 'and' or comma separation before coordination verbs
    action_verbs = r"(?:save|put|take|write|create|add|remind|draft)\b"
    
    # Split on:
    # 1. ", and [action_verb]"
    # 2. ", [action_verb]"
    # 3. " and [action_verb]"
    segments = re.split(
        rf"(?:,\s*(?:and\s+)?|\s+and\s+)(?={action_verbs})",
        cleaned,
        flags=re.IGNORECASE,
    )
    segments = [s.strip(" '\"`?.!,:;") for s in segments if s.strip(" '\"`?.!,:;")]
    if len(segments) >= 2:
        return segments

    return None


async def execute_action_plan(
    segments: List[str],
    db: Session,
    user_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Executes an action plan composed of multiple sequential steps,
    piping data from earlier steps to subsequent steps (e.g. search URLs into notes).
    """
    steps_log: List[Dict[str, Any]] = []
    primary_url: Optional[str] = None
    primary_action: str = "multistep"
    last_url: Optional[str] = None
    last_query: Optional[str] = None

    for idx, seg in enumerate(segments, start=1):
        lower = seg.lower()
        step_entry: Dict[str, Any] = {
            "step": idx,
            "command": seg,
            "status": "pending",
        }

        # --- A. Search or Web Navigation Step ---
        is_web, web_name, web_query, web_url = parse_website_command(seg)
        # If generic "search for [topic]" without explicit site, default to YouTube or Google
        if not is_web and re.match(r"^(?:search\s+(?:for\s+)?|find\s+|look\s+up\s+)(?P<q>.+)$", seg, re.IGNORECASE):
            m_q = re.match(r"^(?:search\s+(?:for\s+)?|find\s+|look\s+up\s+)(?P<q>.+)$", seg, re.IGNORECASE)
            extracted_q = m_q.group("q").strip(" '\"`?.!,:;")
            if extracted_q:
                is_web = True
                web_name = "YouTube" if "tutorial" in extracted_q.lower() or "video" in extracted_q.lower() else "Google"
                if web_name == "YouTube":
                    web_url = f"https://www.youtube.com/results?search_query={quote_plus(extracted_q)}"
                else:
                    web_url = f"https://www.google.com/search?q={quote_plus(extracted_q)}"
                web_query = extracted_q

        if is_web and web_url:
            last_url = web_url
            last_query = web_query or "Search"
            if not primary_url:
                primary_url = web_url
                primary_action = "open_url"

            step_entry.update({
                "action": "open_url",
                "name": web_name,
                "query": web_query,
                "url": web_url,
                "status": "completed",
                "message": f"Opened {web_name} search results for '{web_query}'" if web_query else f"Opened {web_name}",
            })
            steps_log.append(step_entry)
            continue

        # --- B. Note or Notepad Step (Piping search link if requested) ---
        if any(k in lower for k in ["save", "note", "notepad", "write a note", "put a note"]):
            note_content = ""
            if any(k in lower for k in ["link", "url", "search link", "result"]):
                source_url = last_url or "https://www.google.com"
                query_label = last_query or "Search"
                note_content = f"{query_label}: {source_url}"
            else:
                # Extract after "save" / "write" / "note"
                m_txt = re.sub(r"^(?:save|put|take|write)(?:\s+(?:a\s+)?note(?:\s*[:\-]\s*|\s+(?:in\s+notepad\s+)?(?:about\s+)?))?", "", seg, flags=re.IGNORECASE).strip(" '\"`?.!,:;")
                note_content = m_txt if m_txt else seg

            note_res = create_and_open_note(
                content=note_content,
                db=db,
                user_id=user_id,
                title=f"Note: {note_content[:30]}",
            )
            step_entry.update({
                "action": "desktop_open",
                "app": "Notepad",
                "filename": note_res.get("filename"),
                "filepath": note_res.get("filepath"),
                "status": "completed" if note_res.get("success") else "failed",
                "message": f"Saved note to '{note_res.get('filename')}' and opened in Notepad",
            })
            steps_log.append(step_entry)
            continue

        # --- C. Reminder or Task Step ---
        if any(k in lower for k in ["remind", "reminder", "task"]):
            rem_title = seg
            # Extract time expression if present: e.g. "remind me tomorrow" / "remind me tomorrow at 8 pm"
            due = "Tomorrow"
            m_when = re.search(r"(?:tomorrow|today|tonight|next\s+\w+|\w+day)(?:\s+at\s+[\d:\s]+(?:am|pm)?)?", seg, re.IGNORECASE)
            if m_when:
                due = format_due_string(m_when.group(0))
                # Clean title
                clean_title = re.sub(r"^(?:and\s+)?(?:remind\s+me|set\s+(?:a\s+)?reminder|task)\s*(?:to\s+)?", "", seg, flags=re.IGNORECASE)
                clean_title = clean_title.replace(m_when.group(0), "").strip(" '\"`?.!,:;")
                if clean_title:
                    rem_title = clean_title
            else:
                rem_title = re.sub(r"^(?:and\s+)?(?:remind\s+me|set\s+(?:a\s+)?reminder|task)\s*(?:to\s+)?", "", seg, flags=re.IGNORECASE).strip(" '\"`?.!,:;")

            if not rem_title:
                rem_title = f"Follow up on {last_query}" if last_query else "Follow up reminder"

            rem_res = create_reminder_task(
                title=rem_title,
                due_time=due,
                db=db,
                user_id=user_id,
            )
            step_entry.update({
                "action": "reminder_created",
                "title": rem_title,
                "due_date": due,
                "status": "completed",
                "message": f"Created reminder for {due}: '{rem_title}'",
            })
            steps_log.append(step_entry)
            continue

        # Unrecognized step fallback
        step_entry.update({
            "status": "skipped",
            "message": f"Skipped unsupported step: '{seg}'",
        })
        steps_log.append(step_entry)

    if len(steps_log) >= 2:
        successful_steps = [s for s in steps_log if s.get("status") == "completed"]
        lines = [f"{i}. {s['message']}" for i, s in enumerate(successful_steps, start=1)]
        combined_reply = "\n".join(lines)

        return {
            "reply": combined_reply,
            "response": combined_reply,
            "action": {
                "type": primary_action,
                "url": primary_url,
            },
            "url": primary_url,
            "steps": steps_log,
            "is_multistep": True,
        }

    return None
