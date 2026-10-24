import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.models import Contact, User
from app.services.auth_service import get_optional_current_user
from app.services.contact_service import clean_phone_number, is_valid_phone

router = APIRouter(prefix="/contacts", tags=["Contacts Directory"])
logger = logging.getLogger(__name__)


class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=7, max_length=30)
    relationship: Optional[str] = "friend"
    email: Optional[str] = None
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class ContactResponse(BaseModel):
    id: int
    name: str
    phone: str
    relationship: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


def serialize_contact(c: Contact) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone,
        "relationship": c.relationship or "contact",
        "email": c.email,
        "notes": c.notes,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("", response_model=List[ContactResponse])
def list_contacts(
    search: Optional[str] = Query(None, description="Filter by name, phone or relationship"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    query = db.query(Contact)
    if user:
        query = query.filter((Contact.user_id == user.id) | (Contact.user_id.is_(None)))

    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter(
            (Contact.name.ilike(pattern))
            | (Contact.phone.ilike(pattern))
            | (Contact.relationship.ilike(pattern))
            | (Contact.email.ilike(pattern))
        )

    rows = query.order_by(Contact.name.asc()).all()
    return [serialize_contact(c) for c in rows]


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    payload: ContactCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user),
):
    clean_phone = clean_phone_number(payload.phone)
    if not is_valid_phone(clean_phone):
        raise HTTPException(
            status_code=400,
            detail="Invalid phone number. Please enter a valid number with country code (e.g. +94771234567 or +14155552671).",
        )

    contact = Contact(
        user_id=user.id if user else None,
        name=payload.name.strip(),
        phone=clean_phone,
        relationship=(payload.relationship or "friend").strip(),
        email=payload.email.strip() if payload.email else None,
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return serialize_contact(contact)


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    return serialize_contact(contact)


@router.patch("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: int,
    payload: ContactUpdate,
    db: Session = Depends(get_db),
):
    contact = db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")

    if payload.name is not None:
        contact.name = payload.name.strip()
    if payload.phone is not None:
        clean_phone = clean_phone_number(payload.phone)
        if not is_valid_phone(clean_phone):
            raise HTTPException(status_code=400, detail="Invalid phone number.")
        contact.phone = clean_phone
    if payload.relationship is not None:
        contact.relationship = payload.relationship.strip()
    if payload.email is not None:
        contact.email = payload.email.strip() if payload.email else None
    if payload.notes is not None:
        contact.notes = payload.notes.strip() if payload.notes else None

    db.commit()
    db.refresh(contact)
    return serialize_contact(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    db.delete(contact)
    db.commit()
    return None
