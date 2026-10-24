import re
from typing import Any, Dict, Optional
from urllib.parse import quote_plus, urlparse

from sqlalchemy.orm import Session

from app.models.models import CommandHistory, ConversationMessage, Note, Task
from app.services.weather_service import get_weather


class ToolValidationError(Exception):
    """Raised when tool inputs fail validation."""
    pass


class ToolConfirmationRequired(Exception):
    """Raised when an operation requires explicit user confirmation."""
    def __init__(self, message: str, action: str, params: Dict[str, Any]):
        super().__init__(message)
        self.message = message
        self.action = action
        self.params = params


ALLOWED_SCHEMES = {"http", "https"}
ALLOWED_TASK_PRIORITIES = {"high", "medium", "low"}
ALLOWED_TASK_CATEGORIES = {"Dev", "AI", "Study", "Personal", "Work", "General", "Reminder"}


async def tool_youtube_search(query: str, **kwargs) -> Dict[str, Any]:
    """Execute a validated YouTube search."""
    q = (query or "").strip()
    if not q or len(q) > 300:
        raise ToolValidationError("YouTube search query must be between 1 and 300 characters.")

    url = f"https://www.youtube.com/results?search_query={quote_plus(q)}"
    reply_msg = f"Opening YouTube search results for {q}."
    return {
        "reply": reply_msg,
        "response": reply_msg,
        "action": {
            "type": "open_url",
            "url": url,
        },
        "url": url,
        "query": q,
        "target": "youtube",
    }


async def tool_google_search(query: str, **kwargs) -> Dict[str, Any]:
    """Execute a validated web/Google search."""
    q = (query or "").strip()
    if not q or len(q) > 300:
        raise ToolValidationError("Search query must be between 1 and 300 characters.")

    url = f"https://www.google.com/search?q={quote_plus(q)}"
    return {
        "action": "open_url",
        "url": url,
        "query": q,
        "target": "google",
        "response": f'Searching the web for "{q}".',
    }


async def tool_open_website(url: str, **kwargs) -> Dict[str, Any]:
    """Open a validated website URL with strict scheme checking."""
    target_url = (url or "").strip()
    if not target_url:
        raise ToolValidationError("Website URL cannot be blank.")

    # Check for forbidden schemes first
    lower = target_url.lower()
    if lower.startswith(("javascript:", "data:", "file:", "ftp:", "about:", "vbscript:")):
        raise ToolValidationError("Invalid URL protocol. Only HTTP/HTTPS websites are permitted.")

    if "://" in target_url:
        parsed = urlparse(target_url)
        if parsed.scheme.lower() not in ALLOWED_SCHEMES or not parsed.netloc:
            raise ToolValidationError(f"Invalid URL protocol '{parsed.scheme}'. Only HTTP/HTTPS are allowed.")
    else:
        target_url = "https://" + target_url
        parsed = urlparse(target_url)
        if not parsed.netloc:
            raise ToolValidationError("Invalid domain or website URL.")

    return {
        "action": "open_url",
        "url": target_url,
        "target": "website",
        "response": f"Opening {parsed.netloc} in a new tab.",
    }


async def tool_get_weather(location: str, **kwargs) -> Dict[str, Any]:
    """Retrieve weather data for a location."""
    loc = (location or "Colombo").strip()
    if len(loc) > 100:
        raise ToolValidationError("Location name is too long.")

    report = await get_weather(loc)
    return {
        "action": "weather",
        "location": loc,
        "response": report,
        "url": None,
    }


async def tool_manage_tasks(
    action: str,
    db: Session,
    user_id: Optional[str] = None,
    title: Optional[str] = None,
    task_id: Optional[int] = None,
    priority: str = "medium",
    category: str = "General",
    due_date: Optional[str] = None,
    confirmed: bool = False,
    **kwargs,
) -> Dict[str, Any]:
    """Create, list, complete, or delete persistent tasks."""
    act = (action or "").lower().strip()

    if act == "create":
        if not title or not title.strip():
            raise ToolValidationError("Task title cannot be blank.")
        clean_priority = priority.lower() if priority.lower() in ALLOWED_TASK_PRIORITIES else "medium"
        new_task = Task(
            user_id=user_id,
            title=title.strip()[:300],
            priority=clean_priority,
            category=category[:50] if category else "General",
            due_date=due_date[:50] if due_date else None,
            completed=False,
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        return {
            "action": "task_created",
            "task_id": new_task.id,
            "title": new_task.title,
            "response": f'Created task: "{new_task.title}" (Priority: {new_task.priority}).',
        }

    elif act == "list":
        tasks = (
            db.query(Task)
            .filter(Task.user_id == user_id if user_id else True)
            .order_by(Task.completed.asc(), Task.id.desc())
            .limit(10)
            .all()
        )
        if not tasks:
            return {"action": "task_list", "response": "You have no active tasks."}
        summary = "; ".join(f"{t.title} [{'Done' if t.completed else 'Pending'}]" for t in tasks)
        return {
            "action": "task_list",
            "tasks": [{"id": t.id, "title": t.title, "completed": t.completed} for t in tasks],
            "response": f"Your tasks: {summary}",
        }

    elif act == "complete":
        if not task_id:
            raise ToolValidationError("task_id is required to complete a task.")
        t = db.get(Task, task_id)
        if not t:
            return {"action": "task_error", "response": f"Task #{task_id} not found."}
        t.completed = True
        db.commit()
        return {"action": "task_completed", "response": f'Marked task "{t.title}" as completed.'}

    elif act == "delete":
        if not task_id:
            raise ToolValidationError("task_id is required to delete a task.")
        t = db.get(Task, task_id)
        if not t:
            return {"action": "task_error", "response": f"Task #{task_id} not found."}

        # Destructive action requires confirmation unless explicitly confirmed
        if not confirmed:
            raise ToolConfirmationRequired(
                message=f'Are you sure you want to permanently delete task "{t.title}"?',
                action="delete_task",
                params={"task_id": task_id},
            )

        db.delete(t)
        db.commit()
        return {"action": "task_deleted", "response": f'Deleted task "{t.title}".'}

    else:
        raise ToolValidationError(f"Unsupported task action: {action}. Use create, list, complete, or delete.")


async def tool_manage_notes(
    action: str,
    db: Session,
    content: Optional[str] = None,
    note_id: Optional[int] = None,
    user_id: Optional[str] = None,
    confirmed: bool = False,
    **kwargs,
) -> Dict[str, Any]:
    """Create, list, or delete notes."""
    act = (action or "").lower().strip()

    if act == "create":
        if not content or not content.strip():
            raise ToolValidationError("Note content cannot be blank.")
        new_note = Note(content=content.strip(), user_id=user_id)
        db.add(new_note)
        db.commit()
        db.refresh(new_note)
        return {
            "action": "note_saved",
            "response": f"Saved your note: {new_note.content}",
            "note_id": new_note.id,
        }

    elif act == "list":
        notes = (
            db.query(Note)
            .filter(Note.user_id == user_id if user_id else True)
            .order_by(Note.id.desc())
            .limit(5)
            .all()
        )
        if not notes:
            return {"action": "note_list", "response": "You don't have any saved notes yet."}
        summary = "; ".join(n.content for n in notes)
        return {"action": "note_list", "response": f"Your latest notes: {summary}"}

    elif act == "delete":
        if not note_id:
            raise ToolValidationError("note_id is required to delete a note.")
        note = db.get(Note, note_id)
        if not note:
            return {"action": "note_error", "response": f"Note #{note_id} not found."}

        if not confirmed:
            raise ToolConfirmationRequired(
                message=f'Delete note: "{note.content[:40]}..."?',
                action="delete_note",
                params={"note_id": note_id},
            )

        db.delete(note)
        db.commit()
        return {"action": "note_deleted", "response": "Note deleted successfully."}

    else:
        raise ToolValidationError(f"Unsupported note action: {action}.")


async def tool_set_reminder(
    title: str,
    due_time: str,
    db: Session,
    user_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """Set a task reminder with a scheduled time."""
    t = (title or "").strip()
    due = (due_time or "").strip()
    if not t:
        raise ToolValidationError("Reminder title is required.")

    return await tool_manage_tasks(
        action="create",
        db=db,
        user_id=user_id,
        title=f"Reminder: {t}",
        priority="high",
        category="Reminder",
        due_date=due if due else "Today",
    )


async def tool_search_history(
    query: str,
    db: Session,
    **kwargs,
) -> Dict[str, Any]:
    """Search conversation history for matching queries."""
    q = (query or "").strip().lower()
    if not q:
        raise ToolValidationError("Search query cannot be empty.")

    messages = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.content.ilike(f"%{q}%"))
        .order_by(ConversationMessage.id.desc())
        .limit(5)
        .all()
    )

    if not messages:
        return {
            "action": "history_search",
            "response": f'No past messages found matching "{q}".',
        }

    results = [f'[{m.role.upper()}]: {m.content[:100]}' for m in messages]
    return {
        "action": "history_search",
        "response": f'Found {len(messages)} past messages matching "{q}":\n' + "\n".join(results),
        "matches_count": len(messages),
    }


# Tool Registry & Allowlist
TOOLS_ALLOWLIST = {
    "youtube_search": tool_youtube_search,
    "google_search": tool_google_search,
    "open_website": tool_open_website,
    "get_weather": tool_get_weather,
    "manage_tasks": tool_manage_tasks,
    "manage_notes": tool_manage_notes,
    "set_reminder": tool_set_reminder,
    "search_history": tool_search_history,
}


async def execute_tool(tool_name: str, params: Dict[str, Any], db: Session, user_id: Optional[str] = None) -> Dict[str, Any]:
    """Validate and execute a tool from the allowlist."""
    clean_name = tool_name.strip().lower()
    if clean_name not in TOOLS_ALLOWLIST:
        raise ToolValidationError(f'Tool "{tool_name}" is not permitted or unrecognized.')

    handler = TOOLS_ALLOWLIST[clean_name]
    return await handler(db=db, user_id=user_id, **params)
