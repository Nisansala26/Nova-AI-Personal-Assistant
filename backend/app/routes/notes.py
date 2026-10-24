import logging
import os
import subprocess
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import Note, User
from app.services.auth_service import get_optional_current_user
from app.services.desktop_service import (
    create_and_open_note,
    ensure_notes_dir,
    is_windows_os,
)

router = APIRouter(prefix="/notes", tags=["Notes & Notepad Automation"])
logger = logging.getLogger(__name__)


class NoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)
    title: Optional[str] = None
    open_in_notepad: bool = True


class NoteUpdate(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    title: Optional[str] = None
    filename: Optional[str] = None
    filepath: Optional[str] = None
    content: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


def serialize_note(note: Note) -> dict:
    return {
        "id": note.id,
        "title": note.title or "Untitled Note",
        "filename": note.filename,
        "filepath": note.filepath,
        "content": note.content,
        "created_at": note.created_at.isoformat() if note.created_at else None,
        "updated_at": note.updated_at.isoformat() if note.updated_at else None,
    }


@router.get("", response_model=List[dict])
def list_notes(
    search: Optional[str] = Query(None, description="Search query in title or content"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve all persistent notes, optionally filtered by keyword."""
    query = db.query(Note)
    if user:
        query = query.filter((Note.user_id == user.id) | (Note.user_id == None))  # noqa: E711

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter((Note.title.ilike(pattern)) | (Note.content.ilike(pattern)))

    notes = query.order_by(Note.id.desc()).all()
    return [serialize_note(n) for n in notes]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_note_endpoint(
    req: NoteCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    """Create a new note, generate UTF-8 file in Documents/NovaNotes, and open in Windows Notepad."""
    try:
        res = create_and_open_note(
            content=req.content,
            db=db,
            user_id=user.id if user else None,
            title=req.title,
        )
        return {
            "success": True,
            "message": f"Note '{res['filename']}' saved and opened in Notepad." if res["notepad_opened"] else f"Note '{res['filename']}' saved successfully.",
            "note": res,
        }
    except Exception as exc:
        logger.exception("Failed to create note: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{note_id}")
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    """Fetch details of a single note."""
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    return serialize_note(note)


@router.patch("/{note_id}")
def update_note(
    note_id: int,
    req: NoteUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    """Update content and title of an existing note, updating the file on disk."""
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")

    if req.title is not None:
        note.title = req.title.strip()
    if req.content is not None:
        note.content = req.content
        # Also update the file on disk if it exists
        if note.filepath and os.path.exists(note.filepath):
            try:
                with open(note.filepath, "w", encoding="utf-8") as f:
                    f.write(req.content)
            except Exception as e:
                logger.warning("Could not sync file update to %s: %s", note.filepath, e)

    db.commit()
    db.refresh(note)
    return serialize_note(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    """Delete a note from database and disk (with validation)."""
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")

    # Remove file from disk if it exists inside NovaNotes
    if note.filepath and os.path.exists(note.filepath):
        try:
            # Confirm path is inside allowed notes dir
            allowed_dir = os.path.abspath(ensure_notes_dir())
            file_dir = os.path.abspath(os.path.dirname(note.filepath))
            if file_dir == allowed_dir:
                os.remove(note.filepath)
        except Exception as e:
            logger.warning("Could not remove note file %s: %s", note.filepath, e)

    db.delete(note)
    db.commit()
    return None


@router.post("/{note_id}/open")
def open_note_in_notepad(
    note_id: int,
    db: Session = Depends(get_db),
):
    """Open an existing saved note in Windows Notepad."""
    if not is_windows_os():
        raise HTTPException(status_code=400, detail="Windows Notepad automation is only supported on Windows.")

    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")

    filepath = note.filepath
    if not filepath or not os.path.exists(filepath):
        # Recreate file if missing
        notes_dir = ensure_notes_dir()
        filename = note.filename or f"Note_{note.id}.txt"
        filepath = os.path.join(notes_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(note.content)
        note.filepath = filepath
        note.filename = filename
        db.commit()

    try:
        subprocess.Popen(["notepad.exe", filepath], shell=False)
        return {"success": True, "message": f"Opened '{note.filename}' in Windows Notepad."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to launch Notepad: {exc}")
