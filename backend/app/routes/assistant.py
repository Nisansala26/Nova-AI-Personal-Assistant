import json
import logging
import re
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import (
    CommandHistory,
    Conversation,
    ConversationMessage,
    Note,
    User,
)
from app.services.ai_service import stream_ai
from app.services.auth_service import get_optional_current_user
from app.services.command_service import process_command
from app.services.memory_service import format_memory_context

router = APIRouter()
logger = logging.getLogger(__name__)


class CommandRequest(BaseModel):
    command: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[str] = None
    is_voice: bool = False


class ConversationCreate(BaseModel):
    title: str = Field(default="New conversation", min_length=1, max_length=200)


class ConversationUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


def serialize_message(message: ConversationMessage) -> dict:
    return {
        "id": message.id,
        "role": message.role,
        "content": message.content,
        "action": message.action,
        "url": message.url,
        "created_at": message.created_at,
    }


def serialize_conversation(conversation: Conversation) -> dict:
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "messages": [serialize_message(message) for message in conversation.messages],
    }


def get_conversation_or_404(conversation_id: str, db: Session) -> Conversation:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conversation


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    query = db.query(Conversation)
    if user:
        query = query.filter((Conversation.user_id == user.id) | (Conversation.user_id.is_(None)))

    rows = query.order_by(Conversation.updated_at.desc(), Conversation.created_at.desc()).all()
    return [
        {
            "id": row.id,
            "title": row.title,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


@router.post("/conversations", status_code=status.HTTP_201_CREATED)
def create_conversation(
    request: ConversationCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    title = request.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Conversation title cannot be blank.")
    conversation = Conversation(
        title=title,
        user_id=user.id if user else None,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return serialize_conversation(conversation)


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    return serialize_conversation(get_conversation_or_404(conversation_id, db))


@router.patch("/conversations/{conversation_id}")
def rename_conversation(
    conversation_id: str,
    request: ConversationUpdate,
    db: Session = Depends(get_db),
):
    title = request.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Conversation title cannot be blank.")
    conversation = get_conversation_or_404(conversation_id, db)
    conversation.title = title
    db.commit()
    db.refresh(conversation)
    return serialize_conversation(conversation)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    conversation = get_conversation_or_404(conversation_id, db)
    db.delete(conversation)
    db.commit()
    return None


@router.delete("/conversations/{conversation_id}/messages")
def clear_conversation_messages(conversation_id: str, db: Session = Depends(get_db)):
    conversation = get_conversation_or_404(conversation_id, db)
    conversation.messages.clear()
    db.commit()
    return {"ok": True}


@router.post("/conversations/{conversation_id}/regenerate")
async def regenerate_response(
    conversation_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    conversation = get_conversation_or_404(conversation_id, db)
    messages = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation_id)
        .order_by(ConversationMessage.id.asc())
        .all()
    )
    last_user_index = next(
        (
            index
            for index in range(len(messages) - 1, -1, -1)
            if messages[index].role == "user"
        ),
        None,
    )
    if last_user_index is None:
        raise HTTPException(status_code=409, detail="There is no user message to regenerate.")

    user_message = messages[last_user_index]
    history = [
        {"role": message.role, "content": message.content}
        for message in messages[:last_user_index]
        if message.role in {"user", "assistant"}
    ]
    start_time = time.time()
    try:
        if user:
            result = await process_command(user_message.content, db, history, user_id=user.id)
        else:
            result = await process_command(user_message.content, db, history)
    except Exception as error:
        db.rollback()
        logger.exception("Assistant response regeneration failed")
        raise HTTPException(
            status_code=503,
            detail="The assistant could not regenerate this response. Please try again.",
        ) from error

    latency_ms = round((time.time() - start_time) * 1000, 1)

    latest = messages[-1]
    if latest.role == "assistant" and latest.id > user_message.id:
        latest.content = result["response"]
        latest.action = result["action"]
        latest.url = result.get("url")
    else:
        db.add(
            ConversationMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=result["response"],
                action=result["action"],
                url=result.get("url"),
            )
        )
    db.add(
        CommandHistory(
            command=user_message.content,
            response=result["response"],
            action=result["action"],
            is_voice=False,
            latency_ms=latency_ms,
        )
    )
    db.commit()
    return {**result, "conversation_id": conversation.id}


@router.post("/assistant")
async def assistant(
    req: CommandRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    command = req.command.strip()
    if not command:
        raise HTTPException(status_code=422, detail="Command cannot be blank.")

    if req.conversation_id:
        conversation = get_conversation_or_404(req.conversation_id, db)
    else:
        conversation = Conversation(user_id=user.id if user else None)
        db.add(conversation)
        db.flush()

    prior_messages = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation.id)
        .order_by(ConversationMessage.id.desc())
        .limit(20)
        .all()
    )
    prior_messages.reverse()
    history = [
        {"role": message.role, "content": message.content}
        for message in prior_messages
        if message.role in {"user", "assistant"}
    ]

    start_time = time.time()
    try:
        if user:
            result = await process_command(command, db, history, user_id=user.id)
        else:
            result = await process_command(command, db, history)
    except Exception as error:
        db.rollback()
        logger.exception("Assistant command failed")
        if isinstance(error, RuntimeError):
            raise HTTPException(
                status_code=503,
                detail="Assistant service is unavailable. Check backend configuration and try again.",
            ) from error
        raise HTTPException(
            status_code=502,
            detail="The assistant could not complete this request. Please try again.",
        ) from error

    latency_ms = round((time.time() - start_time) * 1000, 1)

    if conversation.title == "New conversation":
        conversation.title = command[:60]

    action_type = result["action"]["type"] if isinstance(result.get("action"), dict) else str(result.get("action") or "answer")

    db.add_all(
        [
            ConversationMessage(
                conversation_id=conversation.id,
                role="user",
                content=command,
            ),
            ConversationMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=result["response"],
                action=action_type,
                url=result.get("url"),
            ),
            CommandHistory(
                command=command,
                response=result["response"],
                action=action_type,
                is_voice=req.is_voice,
                latency_ms=latency_ms,
            ),
        ]
    )
    db.commit()
    result["conversation_id"] = conversation.id
    return result


@router.post("/assistant/stream")
async def assistant_stream(
    req: CommandRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Streaming endpoint: streams token-by-token using Server-Sent Events (SSE).
    If the request is a tool/deterministic action, returns the action payload immediately.
    """
    command = req.command.strip()
    if not command:
        raise HTTPException(status_code=422, detail="Command cannot be blank.")

    if req.conversation_id:
        conversation = get_conversation_or_404(req.conversation_id, db)
    else:
        conversation = Conversation(user_id=user.id if user else None)
        db.add(conversation)
        db.flush()

    prior_messages = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation.id)
        .order_by(ConversationMessage.id.desc())
        .limit(20)
        .all()
    )
    prior_messages.reverse()
    history = [
        {"role": message.role, "content": message.content}
        for message in prior_messages
        if message.role in {"user", "assistant"}
    ]

    async def sse_event_generator():
        # First check deterministic tools
        start_time = time.time()
        # Save user message immediately
        db.add(ConversationMessage(conversation_id=conversation.id, role="user", content=command))
        db.commit()

        # Clean wake words before evaluating deterministic commands
        norm_cmd = re.sub(
            r"^(?:(?:hey|hi|hello|ok|okay)?\s*nova\b|please\b)[,\s:]*",
            "",
            command,
            flags=re.IGNORECASE,
        ).strip()
        text = norm_cmd.lower()

        # If it's a tool/search/website/desktop/whatsapp/email command, process directly:
        is_tool_cmd = any([
            any(k in text for k in ["youtube", "github", "linkedin", "wikipedia", "stackoverflow", "stack overflow", "gmail", "chatgpt", "reddit", "calculator", "calc", "notepad", "explorer", "downloads", "documents", "vs code", "vscode", "chrome", "whatsapp"]),
            text.startswith("search "),
            text.startswith("google "),
            text.startswith("open "),
            text.startswith("find "),
            text.startswith("play "),
            text.startswith("launch "),
            text.startswith("start "),
            text.startswith("weather"),
            text.startswith("create task"),
            text.startswith("add task"),
            text.startswith("task "),
            text.startswith("take a note"),
            text.startswith("write a note"),
            text.startswith("put a note"),
            text.startswith("save a note"),
            text.startswith("note:"),
            text.startswith("show my notes"),
            text.startswith("show notes"),
            text.startswith("search my notes"),
            text.startswith("search notes"),
            text.startswith("remind me"),
            text.startswith("set a reminder"),
            text.startswith("set reminder"),
            text.startswith("message "),
            text.startswith("send message"),
            text.startswith("send a message"),
            text.startswith("draft email"),
            text.startswith("draft an email"),
            text.startswith("write an email"),
            text.startswith("prepare an email"),
            text.startswith("prepare a whatsapp"),
            text in ["hi", "hello", "hey", "bye", "goodbye", "time", "date"],
            " and " in text and any(k in text for k in ["save", "note", "task", "search", "remind"]),
        ])

        if is_tool_cmd:
            try:
                res = await process_command(command, db, history, user_id=user.id if user else None)
            except Exception as err:
                logger.exception("Tool execution failed: %s", err)
                res = {
                    "response": f"I encountered an error executing that command: {str(err)}",
                    "action": "error",
                    "url": None,
                }
            latency_ms = round((time.time() - start_time) * 1000, 1)

            # Persist assistant response
            action_type = res["action"]["type"] if isinstance(res.get("action"), dict) else str(res.get("action") or "answer")
            db.add(ConversationMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=res["response"],
                action=action_type,
                url=res.get("url"),
            ))
            db.add(CommandHistory(
                command=command,
                response=res["response"],
                action=action_type,
                is_voice=req.is_voice,
                latency_ms=latency_ms,
            ))
            db.commit()

            yield f"data: {json.dumps({'type': 'action', 'result': res, 'conversation_id': conversation.id})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
            return

        # General inquiry: stream tokens from Groq
        full_text = []
        memory_ctx = format_memory_context(db, user.id if user else None)
        try:
            async for chunk in stream_ai(command, history, system_extra=memory_ctx):
                yield chunk
                # Extract text to save in DB at the end
                if chunk.startswith("data: "):
                    payload = json.loads(chunk[6:])
                    if "delta" in payload:
                        full_text.append(payload["delta"])

            complete_response = "".join(full_text)
            latency_ms = round((time.time() - start_time) * 1000, 1)

            if complete_response:
                db.add(ConversationMessage(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=complete_response,
                    action="ai",
                    url=None,
                ))
                db.add(CommandHistory(
                    command=command,
                    response=complete_response,
                    action="ai",
                    is_voice=req.is_voice,
                    latency_ms=latency_ms,
                ))
                db.commit()
        except Exception as err:
            logger.exception("Streaming generator failure")
            yield f"data: {json.dumps({'error': str(err)})}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")


@router.get("/history")
def history(db: Session = Depends(get_db)):
    rows = db.query(CommandHistory).order_by(CommandHistory.id.desc()).limit(20).all()
    return [
        {
            "id": r.id,
            "command": r.command,
            "response": r.response,
            "action": r.action,
            "is_voice": r.is_voice,
            "latency_ms": r.latency_ms,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.delete("/history")
def clear_history(db: Session = Depends(get_db)):
    db.query(CommandHistory).delete()
    db.commit()
    return {"ok": True}

