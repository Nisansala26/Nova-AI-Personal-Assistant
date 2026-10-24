from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import DocumentRecord, User
from app.services.auth_service import get_optional_current_user
from app.services.document_service import (
    DocumentError,
    ask_document_question,
    extract_text_from_file,
    generate_document_summary,
)

router = APIRouter(prefix="/documents", tags=["Documents"])


class DocumentQuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


def serialize_doc(d: DocumentRecord, include_text: bool = False) -> dict:
    data = {
        "id": d.id,
        "filename": d.filename,
        "file_type": d.file_type,
        "file_size_kb": d.file_size_kb,
        "word_count": d.word_count,
        "summary": d.summary_text,
        "created_at": d.created_at,
    }
    if include_text:
        data["content_text"] = d.content_text
    return data


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    try:
        content_bytes = await file.read()
        extracted_text, word_count = extract_text_from_file(file.filename, content_bytes)

        record = DocumentRecord(
            user_id=user.id if user else None,
            filename=file.filename,
            file_type=file.filename.split(".")[-1].lower() if "." in file.filename else "txt",
            file_size_kb=round(len(content_bytes) / 1024, 1),
            word_count=word_count,
            content_text=extracted_text,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return serialize_doc(record, include_text=False)

    except DocumentError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(
            status_code=500, detail=f"Unexpected error processing document: {str(err)}"
        ) from err


@router.get("")
def list_documents(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    query = db.query(DocumentRecord)
    if user:
        query = query.filter((DocumentRecord.user_id == user.id) | (DocumentRecord.user_id.is_(None)))
    records = query.order_by(DocumentRecord.created_at.desc()).all()
    return [serialize_doc(r) for r in records]


@router.get("/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    record = db.get(DocumentRecord, document_id)
    if not record:
        raise HTTPException(status_code=404, detail="Document not found.")
    return serialize_doc(record, include_text=True)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    record = db.get(DocumentRecord, document_id)
    if not record:
        raise HTTPException(status_code=404, detail="Document not found.")
    db.delete(record)
    db.commit()
    return None


@router.post("/{document_id}/summarize")
async def summarize_document_endpoint(document_id: str, db: Session = Depends(get_db)):
    record = db.get(DocumentRecord, document_id)
    if not record:
        raise HTTPException(status_code=404, detail="Document not found.")

    if record.summary_text:
        return {"summary": record.summary_text, "cached": True}

    summary = await generate_document_summary(record.content_text, record.filename)
    record.summary_text = summary
    db.commit()
    return {"summary": summary, "cached": False}


@router.post("/{document_id}/ask")
async def ask_document_endpoint(
    document_id: str,
    req: DocumentQuestionRequest,
    db: Session = Depends(get_db),
):
    record = db.get(DocumentRecord, document_id)
    if not record:
        raise HTTPException(status_code=404, detail="Document not found.")

    result = await ask_document_question(
        content=record.content_text,
        filename=record.filename,
        question=req.question,
    )
    return result
