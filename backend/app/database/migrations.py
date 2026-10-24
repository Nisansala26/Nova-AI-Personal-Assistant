from sqlalchemy import inspect, text
from app.database.database import SessionLocal, engine
from app.models.models import (
    CommandHistory,
    Contact,
    Conversation,
    ConversationMessage,
    SchemaMigration,
)

LEGACY_HISTORY_MIGRATION = "legacy-command-history-to-conversations-v1"
SEED_CONTACTS_MIGRATION = "seed-default-contacts-v1"


def migrate_schema_columns() -> None:
    """Safely adds missing columns to SQLite tables if they exist from older schema versions."""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    with engine.begin() as conn:
        if "conversations" in existing_tables:
            cols = [c["name"] for c in inspector.get_columns("conversations")]
            if "user_id" not in cols:
                conn.execute(text("ALTER TABLE conversations ADD COLUMN user_id VARCHAR(36)"))

        if "command_history" in existing_tables:
            cols = [c["name"] for c in inspector.get_columns("command_history")]
            if "is_voice" not in cols:
                conn.execute(text("ALTER TABLE command_history ADD COLUMN is_voice BOOLEAN DEFAULT 0"))
            if "latency_ms" not in cols:
                conn.execute(text("ALTER TABLE command_history ADD COLUMN latency_ms FLOAT DEFAULT 0.0"))

        if "notes" in existing_tables:
            cols = [c["name"] for c in inspector.get_columns("notes")]
            if "user_id" not in cols:
                conn.execute(text("ALTER TABLE notes ADD COLUMN user_id VARCHAR(36)"))
            if "title" not in cols:
                conn.execute(text("ALTER TABLE notes ADD COLUMN title VARCHAR(200)"))
            if "filename" not in cols:
                conn.execute(text("ALTER TABLE notes ADD COLUMN filename VARCHAR(255)"))
            if "filepath" not in cols:
                conn.execute(text("ALTER TABLE notes ADD COLUMN filepath VARCHAR(500)"))
            if "updated_at" not in cols:
                conn.execute(text("ALTER TABLE notes ADD COLUMN updated_at TIMESTAMP"))


def migrate_legacy_command_history() -> None:
    # First ensure column migrations have run
    migrate_schema_columns()

    with SessionLocal() as db:
        migration = db.get(SchemaMigration, LEGACY_HISTORY_MIGRATION)
        if migration:
            return

        rows = db.query(CommandHistory).order_by(CommandHistory.id.asc()).all()
        if rows:
            conversation = Conversation(title="Previous commands")
            db.add(conversation)
            db.flush()

            for row in rows:
                db.add_all(
                    [
                        ConversationMessage(
                            conversation_id=conversation.id,
                            role="user",
                            content=row.command,
                            created_at=row.created_at,
                        ),
                        ConversationMessage(
                            conversation_id=conversation.id,
                            role="assistant",
                            content=row.response,
                            action=row.action,
                            created_at=row.created_at,
                        ),
                    ]
                )

        db.add(SchemaMigration(name=LEGACY_HISTORY_MIGRATION))
        db.commit()

    with SessionLocal() as db:
        contact_mig = db.get(SchemaMigration, SEED_CONTACTS_MIGRATION)
        if not contact_mig:
            if db.query(Contact).count() == 0:
                devni = Contact(
                    name="Devni",
                    phone="+94771234567",
                    relationship="friend",
                    email="devni@example.com",
                    notes="Close friend",
                )
                lecturer = Contact(
                    name="Dr. Smith",
                    phone="+14155552671",
                    relationship="lecturer",
                    email="smith@university.edu",
                    notes="Computer Science Lecturer",
                )
                db.add_all([devni, lecturer])
            db.add(SchemaMigration(name=SEED_CONTACTS_MIGRATION))
            db.commit()
