from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import User
from app.services.auth_service import get_optional_current_user
from app.services.memory_service import (
    delete_user_memory,
    get_user_memories,
    set_user_memory,
)

router = APIRouter(prefix="/memory", tags=["Memory"])


class MemoryCreateRequest(BaseModel):
    key: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=1000)
    category: str = Field(default="preference", max_length=50)


@router.get("")
def list_memories(
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_current_user),
):
    memories = get_user_memories(db, user.id if user else None)
    return [
        {
            "id": m.id,
            "category": m.category,
            "key": m.memory_key,
            "value": m.memory_value,
            "updated_at": m.updated_at,
        }
        for m in memories
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_memory(
    req: MemoryCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_current_user),
):
    item = set_user_memory(
        db=db,
        key=req.key,
        value=req.value,
        category=req.category,
        user_id=user.id if user else None,
    )
    return {
        "id": item.id,
        "category": item.category,
        "key": item.memory_key,
        "value": item.memory_value,
        "updated_at": item.updated_at,
    }


@router.delete("/{memory_id}")
def delete_memory(
    memory_id: int,
    db: Session = Depends(get_db),
):
    success = delete_user_memory(db, memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory item not found.")
    return {"ok": True}
