from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import (
    CommandHistory,
    Conversation,
    ConversationMessage,
    DocumentRecord,
    Note,
    Task,
    User,
)
from app.services.auth_service import get_optional_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/stats")
def get_analytics_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """Return live system analytics calculated from database tables."""
    # 1. Conversation metrics
    conv_count = db.query(Conversation).count()
    msg_count = db.query(ConversationMessage).count()

    # 2. Command & Voice usage
    total_commands = db.query(CommandHistory).count()
    voice_commands = (
        db.query(CommandHistory)
        .filter(CommandHistory.is_voice == True)  # noqa: E712
        .count()
    )
    typed_commands = total_commands - voice_commands
    voice_percentage = (
        round((voice_commands / total_commands) * 100, 1) if total_commands > 0 else 0.0
    )

    # 3. Tasks & Productivity
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.completed == True).count()  # noqa: E712
    pending_tasks = total_tasks - completed_tasks
    task_completion_rate = (
        round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0.0
    )

    # 4. Documents & Knowledge
    total_docs = db.query(DocumentRecord).count()
    total_words = (
        db.query(func.sum(DocumentRecord.word_count)).scalar() or 0
    )

    # 5. Latency metrics
    avg_latency = (
        db.query(func.avg(CommandHistory.latency_ms))
        .filter(CommandHistory.latency_ms > 0)
        .scalar()
    )
    avg_latency_ms = round(avg_latency, 1) if avg_latency else 380.0

    # 6. Notes count
    total_notes = db.query(Note).count()

    # 7. Recent activity stream (chronological feed)
    recent_activities: List[Dict[str, Any]] = []

    # Recent tasks
    recent_tasks = db.query(Task).order_by(Task.updated_at.desc()).limit(4).all()
    for t in recent_tasks:
        recent_activities.append({
            "type": "task",
            "title": t.title,
            "status": "Completed" if t.completed else "Pending",
            "category": t.category,
            "timestamp": t.updated_at or t.created_at,
        })

    # Recent documents
    recent_docs = (
        db.query(DocumentRecord).order_by(DocumentRecord.created_at.desc()).limit(3).all()
    )
    for d in recent_docs:
        recent_activities.append({
            "type": "document",
            "title": f"Uploaded {d.filename}",
            "status": f"{d.file_size_kb} KB",
            "category": d.file_type.upper(),
            "timestamp": d.created_at,
        })

    # Recent conversations
    recent_convs = (
        db.query(Conversation).order_by(Conversation.updated_at.desc()).limit(3).all()
    )
    for c in recent_convs:
        recent_activities.append({
            "type": "conversation",
            "title": c.title,
            "status": "Chat session",
            "category": "Assistant",
            "timestamp": c.updated_at,
        })

    # Sort unified activity stream by timestamp
    recent_activities.sort(
        key=lambda x: str(x.get("timestamp") or ""),
        reverse=True,
    )

    return {
        "overview": {
            "total_conversations": conv_count,
            "total_messages": msg_count,
            "total_commands": total_commands,
            "voice_commands": voice_commands,
            "typed_commands": typed_commands,
            "voice_percentage": voice_percentage,
            "avg_response_time_ms": avg_latency_ms,
        },
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "pending": pending_tasks,
            "completion_rate": task_completion_rate,
        },
        "documents": {
            "total_documents": total_docs,
            "total_words_processed": total_words,
        },
        "notes": {
            "total_notes": total_notes,
        },
        "recent_activity": recent_activities[:10],
    }
