from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.models import UserMemory


def get_user_memories(db: Session, user_id: Optional[str] = None) -> List[UserMemory]:
    """Retrieve all memories for the given user (or global guest memories)."""
    query = db.query(UserMemory)
    if user_id:
        query = query.filter((UserMemory.user_id == user_id) | (UserMemory.user_id.is_(None)))
    return query.order_by(UserMemory.updated_at.desc()).all()


def set_user_memory(
    db: Session,
    key: str,
    value: str,
    category: str = "preference",
    user_id: Optional[str] = None,
) -> UserMemory:
    """Store or update a key/value memory item."""
    clean_key = key.strip().lower()
    clean_value = value.strip()
    category_clean = category.strip().lower() or "preference"

    existing = (
        db.query(UserMemory)
        .filter(
            UserMemory.memory_key == clean_key,
            UserMemory.user_id == user_id if user_id else UserMemory.user_id.is_(None),
        )
        .first()
    )

    if existing:
        existing.memory_value = clean_value
        existing.category = category_clean
        db.commit()
        db.refresh(existing)
        return existing

    new_memory = UserMemory(
        user_id=user_id,
        category=category_clean,
        memory_key=clean_key,
        memory_value=clean_value,
    )
    db.add(new_memory)
    db.commit()
    db.refresh(new_memory)
    return new_memory


def delete_user_memory(db: Session, memory_id: int) -> bool:
    """Delete a memory entry by ID."""
    item = db.get(UserMemory, memory_id)
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def format_memory_context(db: Session, user_id: Optional[str] = None) -> str:
    """Format user memories into a concise prompt block for the LLM."""
    memories = get_user_memories(db, user_id)
    if not memories:
        return ""

    lines = ["Relevant long-term memories and user preferences:"]
    for m in memories[:15]:
        lines.append(f"- {m.memory_key}: {m.memory_value}")
    return "\n".join(lines)
