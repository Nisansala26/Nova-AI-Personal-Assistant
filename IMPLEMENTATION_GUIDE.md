# Nova AI 3.0 — implementation status

## Phase 1: Chat and conversation persistence

- Existing React/Vite, FastAPI, SQLite, Groq, voice input, weather, notes, and command handling remain in place.
- Chat sessions and messages are persisted in SQLite. Conversations can be created, selected, renamed, deleted, and cleared.
- Existing `command_history` rows are copied into a single **Previous commands** conversation on the first backend start after this update. Original rows are retained; a migration marker prevents importing them more than once.
- The latest 20 messages in a conversation are provided as context to Groq. Deterministic commands such as greetings, weather, notes, and search continue to use the existing command handlers.
- Assistant responses support Markdown, tables, links, and syntax highlighting for common programming languages. Copy and regenerate actions are available on assistant messages.
- AI/backend failures are surfaced in the chat instead of being presented as successful answers.

## Existing limitations and next phases

- True full-duplex voice requires additional infrastructure. Current speech recognition and speech synthesis use browser-supported APIs.
- Tasks, reminders, document analysis, real web research, YouTube API integration, dashboard data, and persisted personalization remain future phases. Their navigation entries are previews, not working modules.
- Conversations currently belong to this local installation; there is no account or multi-user access control.

## Setup (PowerShell)

Run the backend and frontend in separate terminals from the project root:

```powershell
# Terminal 1
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

```powershell
# Terminal 2
cd frontend
npm install
npm run dev
```

The UI is at http://localhost:5173/ and API documentation is at http://127.0.0.1:8000/docs.

Set `GROQ_API_KEY` in `backend/.env` for AI-generated answers. The key remains in the backend environment and must not be placed in frontend code or shared. Existing local SQLite data is retained during the conversation migration.
