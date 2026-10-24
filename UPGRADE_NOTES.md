# Nova AI 2.0 — Phase 1 UI upgrade

This upgrade replaces the React dashboard with a responsive workspace, voice orb, full chat-style conversation, quick actions, status indicator, and recent-history navigation. The original FastAPI endpoints and command logic are unchanged. **This does not yet implement LLM conversational memory, reminders, or document upload.**

## Run

Backend (PowerShell):
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```
If the venv is absent, create one (`py -m venv venv`) and install requirements (`python -m pip install -r requirements.txt`).

Frontend (new terminal):
```powershell
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

**Important:** Your `.env` and SQLite data were deliberately excluded from this ZIP. Copy your existing `backend/.env` into the new backend folder locally; never publish it. Your original database is still in the original project.
