import re
from datetime import datetime
from collections.abc import Sequence
from typing import Optional
from urllib.parse import quote_plus

from app.models.models import Note
from app.services.ai_service import ask_ai
from app.services.desktop_service import (
    create_and_open_note,
    launch_windows_app,
    parse_desktop_command,
    parse_notepad_voice_command,
)
from app.services.action_planner import decompose_compound_command, execute_action_plan
from app.services.email_service import generate_email_draft, parse_email_command
from app.services.memory_service import format_memory_context
from app.services.multistep_service import detect_multistep_command, execute_multistep_pipeline
from app.services.reminder_service import create_reminder_task, parse_reminder_command
from app.services.tool_service import execute_tool
from app.services.website_service import parse_website_command
from app.services.whatsapp_service import parse_whatsapp_command


def parse_youtube_command(raw_command: str) -> tuple[bool, str | None, str | None]:
    """Detects natural-language commands for YouTube search or navigation."""
    raw = raw_command.strip()
    if not raw:
        return False, None, None

    cleaned = raw.strip(" '\"`")
    # Strip leading wake words, greetings and polite words (e.g. "nova", "hey nova", "please")
    cleaned = re.sub(
        r"^(?:(?:hey|hi|hello|ok|okay)?\s*nova\b|please\b)[,\s:]*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()
    text = cleaned.lower()

    if "youtube" not in text:
        return False, None, None

    if re.match(r"^(?:open|launch|go\s+to)?\s*youtube[\s.?!]*$", cleaned, re.IGNORECASE):
        return True, None, "https://www.youtube.com"

    patterns = [
        r"^(?:open|go\s+to|launch)\s+youtube\s+(?:and|to)\s+(?:search\s+(?:for\s+)?|find\s+|look\s+up\s+)(?P<query>.+)$",
        r"^(?:search|look\s*up|find)\s+(?:on\s+)?youtube\s+(?:for\s+)?(?P<query>.+)$",
        r"^youtube\s+(?:search\s+(?:for\s+)?|find\s+|lookup\s+)(?P<query>.+)$",
        r"^(?:search\s+for|search|find|look\s*up|look\s+for|play|watch|show\s+me|show|open)\s+(?P<query>.+?)\s+(?:on|in)\s+youtube[\s.?!]*$",
        r"^(?P<query>.+?)\s+(?:on|in)\s+youtube[\s.?!]*$",
    ]

    for pattern in patterns:
        match = re.match(pattern, cleaned, re.IGNORECASE)
        if match:
            extracted = match.group("query").strip(" '\"`?.!,:;")
            if extracted.lower().startswith("for "):
                extracted = extracted[4:].strip(" '\"`?.!,:;")
            if extracted:
                return (
                    True,
                    extracted,
                    f"https://www.youtube.com/results?search_query={quote_plus(extracted)}",
                )

    return True, None, "https://www.youtube.com"


async def process_command(
    command: str,
    db,
    conversation_history: Sequence[dict[str, str]] = (),
    user_id: Optional[str] = None,
):
    raw = command.strip()
    text = raw.lower()

    # --------------------------------
    # EMPTY COMMAND
    # --------------------------------
    if not raw:
        return {
            "response": "Please say or type a command.",
            "action": "answer",
            "url": None,
        }

    # --------------------------------
    # BASIC GREETINGS & PERSONALITY
    # --------------------------------
    if text in ["hi", "hello", "hey", "hi nova", "hello nova", "hey nova"]:
        return {
            "response": "Hello! How can I help you?",
            "action": "conversation",
            "url": None,
        }

    if text in ["how are you", "how are you?", "how are you nova"]:
        return {
            "response": "I'm performing at peak efficiency! All systems and tools are ready. How can I help you?",
            "action": "conversation",
            "url": None,
        }

    if text in ["thank you", "thanks", "thank you nova", "thanks nova"]:
        return {
            "response": "You're very welcome! Let me know if you need anything else.",
            "action": "conversation",
            "url": None,
        }

    if text in ["bye", "goodbye", "see you"]:
        return {
            "response": "Goodbye! Have a productive and wonderful day!",
            "action": "conversation",
            "url": None,
        }

    if text in ["who are you", "what is your name", "what's your name"]:
        return {
            "response": "I'm Nova, your personal voice and intelligence assistant built with FastAPI, React, and Groq AI.",
            "action": "conversation",
            "url": None,
        }

    if text in ["what can you do", "help", "help me"]:
        return {
            "response": (
                "Here is what I can do for you:\n"
                "• **YouTube & Web Search**: 'Search YouTube for Python tutorials', 'Search for React 19'\n"
                "• **Task Management**: 'Add task finish project report', 'Show my tasks'\n"
                "• **Smart Reminders**: 'Remind me to study algorithms tomorrow'\n"
                "• **Notes**: 'Take a note buy groceries', 'Show my notes'\n"
                "• **Weather**: 'Weather in Colombo', 'Weather in Tokyo'\n"
                "• **Document Assistant**: Upload PDFs/DOCX and ask questions with citations\n"
                "• **History & Memory**: 'Search history for Python', personalized memory preferences"
            ),
            "action": "conversation",
            "url": None,
        }

    # --------------------------------
    # TIME & DATE
    # --------------------------------
    if "time" in text and "timer" not in text and "reminder" not in text:
        return {
            "response": f"The current time is {datetime.now().strftime('%I:%M %p')}.",
            "action": "time",
            "url": None,
        }

    if text in ["date", "what day", "what is the date", "what's the date", "what is today's date"]:
        return {
            "response": f"Today is {datetime.now().strftime('%A, %B %d, %Y')}.",
            "action": "date",
            "url": None,
        }

    # --------------------------------
    # MULTI-STEP ACTION PLANNER (Feature 1 & 8)
    # --------------------------------
    segments = decompose_compound_command(raw)
    if segments and len(segments) >= 2:
        plan_res = await execute_action_plan(segments, db, user_id=user_id)
        if plan_res:
            return plan_res

    # --------------------------------
    # WHATSAPP COMMUNICATION ASSISTANT (Feature 5)
    # --------------------------------
    is_wa, wa_res = parse_whatsapp_command(raw, db, user_id=user_id)
    if is_wa and wa_res:
        return wa_res

    # --------------------------------
    # SMART EMAIL ASSISTANT (Feature 6)
    # --------------------------------
    is_email, rec_hint, email_topic = parse_email_command(raw)
    if is_email and email_topic:
        return await generate_email_draft(rec_hint, email_topic, db, user_id=user_id)

    # --------------------------------
    # NATURAL-LANGUAGE REMINDERS (Feature 7)
    # --------------------------------
    is_rem, rem_title, rem_due = parse_reminder_command(raw)
    if is_rem and rem_title:
        return create_reminder_task(rem_title, rem_due or "Today", db, user_id=user_id)

    # --------------------------------
    # UNIVERSAL WEBSITE & BROWSER COMMANDS
    # --------------------------------
    is_web, web_target, web_query, web_url = parse_website_command(raw)
    if is_web and web_url:
        if web_query:
            reply_text = f"Opening {web_target} search results for {web_query}."
        else:
            reply_text = f"Opening {web_target}."
        return {
            "reply": reply_text,
            "response": reply_text,
            "action": {
                "type": "open_url",
                "url": web_url,
            },
            "url": web_url,
            "query": web_query,
            "target": (web_target or "website").lower(),
        }

    # --------------------------------
    # NOTEPAD NOTE AUTOMATION (Feature 4)
    # --------------------------------
    is_note_cmd, note_dictation = parse_notepad_voice_command(raw)
    if is_note_cmd and note_dictation:
        res = create_and_open_note(note_dictation, db, user_id=user_id)
        reply_text = f"Saved note to '{res['filename']}' and opened in Windows Notepad." if res.get("notepad_opened") else f"Saved note to '{res['filename']}'."
        return {
            "reply": reply_text,
            "response": reply_text,
            "action": {
                "type": "desktop_open",
                "app": "Notepad",
                "app_key": "notepad",
                "success": bool(res.get("notepad_opened")),
                "pid": res.get("notepad_pid"),
                "error": res.get("notepad_error"),
                "file": res["filename"],
                "path": res["filepath"],
            },
            "note": res,
            "url": None,
            "target": "notepad",
        }

    if text in ["show my saved notes", "show my notes", "show notes", "list notes", "my notes", "view my notes"]:
        notes = db.query(Note).order_by(Note.id.desc()).limit(10).all()
        if not notes:
            return {"reply": "You don't have any saved notes yet.", "response": "You don't have any saved notes yet.", "action": "conversation", "url": None}
        lines = [f"- **{n.title or n.filename or 'Note'}**: {n.content[:60]}..." for n in notes]
        resp = "Here are your recent saved notes:\n\n" + "\n".join(lines)
        return {"reply": resp, "response": resp, "action": "conversation", "url": None}

    search_notes_m = re.match(r"^(?:search\s+(?:my\s+)?notes\s+(?:for\s+)?)(?P<q>.+)$", text)
    if search_notes_m:
        q = search_notes_m.group("q").strip()
        pattern = f"%{q}%"
        matches = db.query(Note).filter((Note.title.ilike(pattern)) | (Note.content.ilike(pattern))).limit(10).all()
        if not matches:
            return {"reply": f"No notes found matching '{q}'.", "response": f"No notes found matching '{q}'.", "action": "conversation", "url": None}
        lines = [f"- **{n.title or n.filename}**: {n.content}" for n in matches]
        resp = f"Found {len(matches)} note(s) matching '{q}':\n\n" + "\n".join(lines)
        return {"reply": resp, "response": resp, "action": "conversation", "url": None}

    # --------------------------------
    # WINDOWS DESKTOP AUTOMATION (Feature 3)
    # --------------------------------
    is_desktop, app_key, app_name = parse_desktop_command(raw)
    if is_desktop and app_key:
        success, msg, details = launch_windows_app(app_key)
        return {
            "reply": msg,
            "response": msg,
            "action": {
                "type": "desktop_open",
                "app": app_name,
                "app_key": app_key,
                "success": success,
                "pid": details.get("pid"),
                "error": details.get("error"),
                "verified": details.get("verified", False),
            },
            "url": None,
            "target": app_key,
        }

    # --------------------------------
    # TASK MANAGEMENT (Tool Calling)
    # --------------------------------
    task_create_prefixes = ["create task ", "add task ", "new task ", "task "]
    for prefix in task_create_prefixes:
        if text.startswith(prefix):
            task_title = raw[len(prefix):].strip(" '\"`?.!,:;")
            if task_title:
                return await execute_tool(
                    "manage_tasks",
                    {"action": "create", "title": task_title, "category": "General"},
                    db=db,
                    user_id=user_id,
                )

    if text in ["show my tasks", "list my tasks", "show tasks", "list tasks", "my tasks", "what are my tasks"]:
        return await execute_tool("manage_tasks", {"action": "list"}, db=db, user_id=user_id)

    # --------------------------------
    # REMINDERS (Tool Calling)
    # --------------------------------
    if text.startswith("remind me to "):
        remind_body = raw[len("remind me to "):].strip()
        # Parse optional time or date: e.g. "remind me to study python tomorrow at 7 pm"
        match = re.search(r"^(?P<title>.+?)\s+(?:at|on|by|tomorrow)\s+(?P<due>.+)$", remind_body, re.IGNORECASE)
        if match:
            rem_title = match.group("title").strip()
            rem_due = match.group("due").strip()
        else:
            rem_title = remind_body
            rem_due = "Today"

        return await execute_tool(
            "set_reminder",
            {"title": rem_title, "due_time": rem_due},
            db=db,
            user_id=user_id,
        )

    # --------------------------------
    # SAVE & READ NOTES (Tool Calling)
    # --------------------------------
    note_prefixes = ["take a note ", "create a note ", "save note ", "note "]
    for prefix in note_prefixes:
        if text.startswith(prefix):
            content = raw[len(prefix):].strip()
            if content:
                return await execute_tool(
                    "manage_notes",
                    {"action": "create", "content": content},
                    db=db,
                    user_id=user_id,
                )

    if text in ["read my notes", "show my notes", "list notes", "my notes"]:
        return await execute_tool("manage_notes", {"action": "list"}, db=db, user_id=user_id)

    # --------------------------------
    # SEARCH HISTORY (Tool Calling)
    # --------------------------------
    if text.startswith("search history for ") or text.startswith("search my history for "):
        q = raw.split("for ", 1)[-1].strip()
        if q:
            return await execute_tool("search_history", {"query": q}, db=db, user_id=user_id)

    # --------------------------------
    # WEATHER (Tool Calling)
    # --------------------------------
    if text.startswith("weather") or "weather in " in text:
        location = "Colombo"
        if "weather in " in text:
            idx = text.index("weather in ") + len("weather in ")
            location = raw[idx:].strip(" ?.")
        return await execute_tool("get_weather", {"location": location}, db=db, user_id=user_id)

    # --------------------------------
    # GROQ AI (General Inquiries with Memory Context)
    # --------------------------------
    memory_context = format_memory_context(db, user_id)
    ai_response = await ask_ai(raw, conversation_history, system_extra=memory_context)
    return {
        "response": ai_response,
        "action": "ai",
        "url": None,
    }
