from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import Task, User
from app.services.auth_service import get_optional_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: Optional[str] = None
    category: str = Field(default="General", max_length=50)
    priority: str = Field(default="medium")  # high, medium, low
    due_date: Optional[str] = Field(default=None, max_length=50)


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    completed: Optional[bool] = None


def serialize_task(t: Task) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "category": t.category,
        "priority": t.priority,
        "due_date": t.due_date,
        "completed": t.completed,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
    }


@router.get("")
def list_tasks(
    completed: Optional[bool] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_current_user),
):
    query = db.query(Task)
    if user:
        query = query.filter((Task.user_id == user.id) | (Task.user_id.is_(None)))

    if completed is not None:
        query = query.filter(Task.completed == completed)
    if priority:
        query = query.filter(Task.priority == priority.lower())
    if category:
        query = query.filter(Task.category == category)
    if search:
        query = query.filter(Task.title.ilike(f"%{search.strip()}%"))

    tasks = query.order_by(Task.completed.asc(), Task.id.desc()).all()
    return [serialize_task(t) for t in tasks]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_task(
    req: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_optional_current_user),
):
    clean_priority = req.priority.lower() if req.priority.lower() in {"high", "medium", "low"} else "medium"
    new_task = Task(
        user_id=user.id if user else None,
        title=req.title.strip(),
        description=req.description.strip() if req.description else None,
        category=req.category.strip() if req.category else "General",
        priority=clean_priority,
        due_date=req.due_date.strip() if req.due_date else None,
        completed=False,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return serialize_task(new_task)


@router.patch("/{task_id}")
def update_task(
    task_id: int,
    req: TaskUpdate,
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    if req.title is not None:
        clean_title = req.title.strip()
        if not clean_title:
            raise HTTPException(status_code=422, detail="Title cannot be blank.")
        task.title = clean_title
    if req.description is not None:
        task.description = req.description.strip() or None
    if req.category is not None:
        task.category = req.category.strip() or "General"
    if req.priority is not None:
        p = req.priority.lower()
        if p in {"high", "medium", "low"}:
            task.priority = p
    if req.due_date is not None:
        task.due_date = req.due_date.strip() or None
    if req.completed is not None:
        task.completed = req.completed

    db.commit()
    db.refresh(task)
    return serialize_task(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    db.delete(task)
    db.commit()
    return None
