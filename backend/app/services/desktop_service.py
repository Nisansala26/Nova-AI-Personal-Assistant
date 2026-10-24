import logging
import os
import platform
import re
import shutil
import subprocess
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import Note

logger = logging.getLogger(__name__)

# Notes storage path inside user's Documents folder
NOTES_DIR = os.path.join(os.path.expanduser("~"), "Documents", "NovaNotes")

# Supported Windows applications allowlist with safe launch configurations
WINDOWS_APP_ALLOWLIST = {
    "notepad": {
        "name": "Notepad",
        "description": "Windows text editor",
        "command": ["notepad.exe"],
        "aliases": ["notepad", "text editor", "windows notepad", "the notepad"],
        "image_name": "notepad.exe",
    },
    "calculator": {
        "name": "Calculator",
        "description": "Windows calculator",
        "command": ["calc.exe"],
        "aliases": ["calculator", "calc", "windows calculator"],
        "image_name": "CalculatorApp.exe",
    },
    "explorer": {
        "name": "File Explorer",
        "description": "Windows file explorer",
        "command": ["explorer.exe"],
        "aliases": ["file explorer", "explorer", "files", "my computer", "windows explorer"],
        "image_name": "explorer.exe",
    },
    "downloads": {
        "name": "Downloads",
        "description": "User Downloads directory",
        "command": ["explorer.exe", os.path.join(os.path.expanduser("~"), "Downloads")],
        "aliases": ["downloads", "downloads folder", "download folder"],
        "image_name": "explorer.exe",
    },
    "documents": {
        "name": "Documents",
        "description": "User Documents directory",
        "command": ["explorer.exe", os.path.join(os.path.expanduser("~"), "Documents")],
        "aliases": ["documents", "documents folder", "my documents"],
        "image_name": "explorer.exe",
    },
    "vscode": {
        "name": "Visual Studio Code",
        "description": "Code editor",
        "command": ["cmd.exe", "/c", "code"],
        "aliases": ["vs code", "vscode", "code editor", "visual studio code"],
        "image_name": "Code.exe",
    },
    "chrome": {
        "name": "Google Chrome",
        "description": "Web browser",
        "command": ["cmd.exe", "/c", "start", "chrome"],
        "aliases": ["chrome", "google chrome"],
        "image_name": "chrome.exe",
    },
}


def is_windows_os() -> bool:
    """Verify if backend is executing locally on a Windows operating system."""
    return platform.system() == "Windows"


def verify_windows_desktop_environment() -> Tuple[bool, Optional[str]]:
    """
    Verify that the backend is running locally on a real Windows desktop environment,
    and not inside WSL, Docker container, or a non-Windows OS that cannot access the GUI desktop.
    """
    if platform.system() != "Windows":
        return (
            False,
            f"Backend is executing on '{platform.system()}', not Windows. Desktop application automation requires Windows.",
        )

    # Check for WSL environment
    if os.environ.get("WSL_DISTRO_NAME") or os.environ.get("WSL_INTEROP"):
        return (
            False,
            "Backend is executing inside Windows Subsystem for Linux (WSL) and cannot access the Windows GUI desktop.",
        )

    # Check for Docker container environment
    if os.path.exists("/.dockerenv") or os.path.exists("/run/.containerenv"):
        return (
            False,
            "Backend is executing inside a Docker container and cannot access the host Windows desktop.",
        )

    return True, None


def ensure_notes_dir() -> str:
    """Ensure the ~/Documents/NovaNotes directory exists and return its path."""
    os.makedirs(NOTES_DIR, exist_ok=True)
    return NOTES_DIR


def launch_windows_app(
    app_key: str,
    extra_args: Optional[List[str]] = None,
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Launch an approved application from the allowlist using safe subprocess APIs.
    Validates Windows environment, launches the process, and verifies process execution.
    Returns: (success: bool, reply_message: str, details: dict)
    """
    env_ok, env_err = verify_windows_desktop_environment()
    if not env_ok:
        logger.error("Desktop launch aborted: %s", env_err)
        return False, env_err or "Unsupported desktop environment.", {
            "app_key": app_key,
            "app": app_key,
            "success": False,
            "error": env_err,
            "pid": None,
            "verified": False,
        }

    app_config = WINDOWS_APP_ALLOWLIST.get(app_key)
    if not app_config:
        err_msg = f"Application '{app_key}' is not in the approved desktop allowlist."
        logger.warning(err_msg)
        return False, err_msg, {
            "app_key": app_key,
            "app": app_key,
            "success": False,
            "error": err_msg,
            "pid": None,
            "verified": False,
        }

    app_name = app_config["name"]
    base_cmd = list(app_config["command"])
    cmd = base_cmd + (extra_args or [])

    # Resolve executable path safely
    exe = cmd[0]
    resolved_exe = shutil.which(exe) if not os.path.isabs(exe) else exe
    if resolved_exe:
        cmd[0] = resolved_exe

    logger.info("Executing desktop launch for '%s' (%s) with arguments: %s", app_name, app_key, cmd)

    startupinfo = None
    if platform.system() == "Windows":
        startupinfo = subprocess.STARTUPINFO()
        # Direct execution to interactive user desktop if running on custom/virtual desktop
        try:
            startupinfo.lpDesktop = r"WinSta0\default"
        except Exception as exc:
            logger.debug("Could not assign startupinfo.lpDesktop: %s", exc)

    proc = None
    try:
        proc = subprocess.Popen(
            cmd,
            shell=False,
            startupinfo=startupinfo,
        )
    except FileNotFoundError as fnf:
        err_msg = f"Executable for {app_name} ({cmd[0]}) not found on this system: {fnf}"
        logger.error(err_msg)
        return False, err_msg, {
            "app_key": app_key,
            "app": app_name,
            "success": False,
            "error": err_msg,
            "pid": None,
            "verified": False,
        }
    except Exception as exc:
        err_msg = f"Could not launch {app_name}: {str(exc)}"
        logger.exception("Failed to launch application '%s'", app_key)
        return False, err_msg, {
            "app_key": app_key,
            "app": app_name,
            "success": False,
            "error": err_msg,
            "pid": None,
            "verified": False,
        }

    pid = proc.pid
    logger.info("Launched %s subprocess successfully (Initial PID: %s). Verifying process execution...", app_name, pid)

    # Allow process a brief moment to initialize or report immediate startup failure
    time.sleep(0.35)
    poll_code = proc.poll()

    if poll_code is not None and poll_code != 0:
        err_msg = f"{app_name} terminated immediately after launch with exit code {poll_code}."
        logger.error(err_msg)
        return False, err_msg, {
            "app_key": app_key,
            "app": app_name,
            "success": False,
            "error": err_msg,
            "pid": pid,
            "verified": False,
        }

    # Verify process active in system
    image_name = app_config.get("image_name", f"{app_key}.exe")
    is_active = poll_code is None
    verified_in_tasklist = False

    try:
        tasklist_out = subprocess.check_output(
            ["tasklist", "/FI", f"IMAGENAME eq {image_name}", "/FO", "CSV", "/NH"],
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            timeout=3.0,
        ).decode("utf-8", errors="ignore")
        if image_name.lower() in tasklist_out.lower():
            verified_in_tasklist = True
            is_active = True
    except Exception as exc:
        logger.warning("Could not query tasklist to verify %s: %s", image_name, exc)

    if not is_active:
        err_msg = f"Failed to verify active process for {app_name} after execution."
        logger.error(err_msg)
        return False, err_msg, {
            "app_key": app_key,
            "app": app_name,
            "success": False,
            "error": err_msg,
            "pid": pid,
            "verified": False,
        }

    success_msg = f"Opened {app_name} successfully."
    logger.info("Successfully launched and verified %s (PID: %s, in_tasklist: %s)", app_name, pid, verified_in_tasklist)
    return True, success_msg, {
        "app_key": app_key,
        "app": app_name,
        "success": True,
        "pid": pid,
        "error": None,
        "verified": True,
    }


def create_and_open_note(
    content: str,
    db: Session,
    user_id: Optional[str] = None,
    title: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Feature 4:
    1. Extract exact dictated content.
    2. Create UTF-8 text file inside Documents/NovaNotes.
    3. Generate unique filename.
    4. Save note in database.
    5. Open file in Windows Notepad using verified desktop launcher.
    """
    content = content.strip()
    if not content:
        raise ValueError("Note content cannot be empty.")

    notes_path = ensure_notes_dir()

    # Generate title snippet and safe filename
    clean_snippet = re.sub(r"[^\w\s-]", "", content[:24]).strip()
    slug = re.sub(r"[-\s]+", "_", clean_snippet) or "note"
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Note_{timestamp}_{slug}.txt"
    filepath = os.path.join(notes_path, filename)

    # Write UTF-8 file
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    # Store note metadata in SQLite
    note_title = title or (content[:40] + ("..." if len(content) > 40 else ""))
    db_note = Note(
        user_id=user_id,
        title=note_title,
        filename=filename,
        filepath=filepath,
        content=content,
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)

    # Open the file in Windows Notepad if running on Windows
    notepad_opened = False
    notepad_pid = None
    notepad_error = None
    if is_windows_os():
        try:
            n_success, n_msg, n_details = launch_windows_app("notepad", extra_args=[filepath])
            notepad_opened = n_success
            notepad_pid = n_details.get("pid")
            notepad_error = n_details.get("error")
        except Exception as exc:
            logger.warning("Could not launch notepad for file %s: %s", filepath, exc)
            notepad_error = str(exc)

    return {
        "success": True,
        "note_id": db_note.id,
        "title": note_title,
        "filename": filename,
        "filepath": filepath,
        "content": content,
        "notepad_opened": notepad_opened,
        "notepad_pid": notepad_pid,
        "notepad_error": notepad_error,
    }


def parse_desktop_command(raw_command: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Detects desktop launch commands.
    Returns: (is_desktop_cmd, app_key, app_name)
    """
    if not raw_command or not raw_command.strip():
        return False, None, None

    # Clean wake words, punctuation, polite words
    cleaned = raw_command.strip(" '\"`")
    cleaned = re.sub(
        r"^(?:(?:hey|hi|hello|ok|okay)?\s*nova\b|please\b|can\s+you\b|could\s+you\b)[,\s:]*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()
    text = cleaned.strip(" '\"`?.!,:;").lower()
    text = re.sub(r"\bplease\b", "", text).strip(" '\"`?.!,:;")

    # Skip if note writing intent (handled by parse_notepad_voice_command)
    if any(k in text for k in ["write", "put a note", "take a note", "save a note", "note:"]):
        return False, None, None

    for app_key, info in WINDOWS_APP_ALLOWLIST.items():
        aliases = info.get("aliases", [app_key])
        for alias in aliases:
            patterns = [
                rf"^(?:open|launch|start|run|bring\s+up)\s+(?:the\s+|windows\s+|app\s+|application\s+)?{re.escape(alias)}(?:\.exe|\s+app|\s+application)?$",
                rf"^{re.escape(alias)}(?:\.exe)?$",
            ]
            for pat in patterns:
                if re.match(pat, text, re.IGNORECASE):
                    return True, app_key, info["name"]

    return False, None, None


def parse_notepad_voice_command(raw_command: str) -> Tuple[bool, Optional[str]]:
    """
    Detects Notepad note creation commands:
    - "Nova, put a note: 5 rice"
    - "Nova, write a note: Buy milk tomorrow"
    - "Nova, open Notepad and write Hello World"
    - "Nova, save a note: Complete my assignment"
    Returns: (is_note_cmd, content)
    """
    if not raw_command or not raw_command.strip():
        return False, None

    cleaned = raw_command.strip(" '\"`")
    cleaned = re.sub(
        r"^(?:(?:hey|hi|hello|ok|okay)?\s*nova\b|please\b)[,\s:]*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()

    patterns = [
        # "put a note: 5 rice" or "put a note 5 rice"
        r"^(?:put|take|write|save|add|create)\s+(?:a\s+)?note(?:\s*:\s*|\s+that\s+|\s+to\s+|\s+)(?P<content>.+)$",
        # "open notepad and write Hello World"
        r"^(?:open\s+notepad\s+(?:and\s+)?(?:write|type|put|save)\s+)(?P<content>.+)$",
        # "note: buy groceries"
        r"^note\s*:\s*(?P<content>.+)$",
    ]

    for pat in patterns:
        m = re.match(pat, cleaned, re.IGNORECASE)
        if m:
            content = m.group("content").strip(" '\"`")
            if content:
                return True, content

    return False, None
