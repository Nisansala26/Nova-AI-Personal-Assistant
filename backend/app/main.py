from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.database.database import Base, engine
from app.database.migrations import migrate_legacy_command_history

from app.routes.assistant import router as assistant_router
from app.routes.auth import router as auth_router
from app.routes.tasks import router as tasks_router
from app.routes.documents import router as documents_router
from app.routes.analytics import router as analytics_router
from app.routes.memory import router as memory_router
from app.routes.notes import router as notes_router
from app.routes.contacts import router as contacts_router

load_dotenv()

# Initialize tables and migration
Base.metadata.create_all(bind=engine)
migrate_legacy_command_history()

app = FastAPI(
    title="Nova AI — Professional Voice Assistant API",
    description="Enterprise-grade AI Assistant backend featuring Groq AI, real-time voice, tools, documents, and analytics.",
    version="3.0.0",
)

# CORS configuration allowing local frontend clients on any dev port
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(assistant_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(memory_router, prefix="/api")
app.include_router(notes_router, prefix="/api")
app.include_router(contacts_router, prefix="/api")


@app.get("/")
@app.get("/api/health")
def root():
    return {
        "name": "Nova AI Professional Assistant API",
        "version": "3.0.0",
        "status": "online",
        "docs_url": "/docs",
    }
