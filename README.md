# Nova AI 3.0 — Complete Professional AI Voice & Desktop Assistant

[![FastAPI](https://img.shields.io/badge/FastAPI-0.120+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![Groq AI](https://img.shields.io/badge/Groq-Llama--3.3--70B-F55036.svg)](https://groq.com)
[![SQLite](https://img.shields.io/badge/SQLite-SQLAlchemy-003B57.svg?logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6.svg?logo=windows&logoColor=white)](https://microsoft.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

> **Nova AI** is an intelligent, voice-controlled full-stack personal assistant built with high-performance asynchronous FastAPI, React 18, Groq LLM intelligence, local Windows desktop automation, and persistent SQLite storage.

---

## 🌟 Feature Overview

### 1. 🎙️ Advanced AI Voice Assistant
- **Real-Time Voice States**: Distinct visual feedback across `Idle`, `Listening`, `Processing`, `Speaking`, and `Error` states.
- **Futuristic 3D Voice Orb**: Pulsing orb with reactive states and audio visualization.
- **Hands-Free Wake Word**: Natural "Hey Nova" wake-word detection mode with activation sound chime.
- **Voice Interruption**: Stop speaking controls to interrupt Nova mid-sentence immediately.
- **Speech Settings**: Multi-voice dropdown picker, adjustable speech rate slider, and auto-speak toggle.
- **Deduplication Safeguards**: 2500ms sliding timestamp window prevents duplicate execution of speech transcripts.

### 2. 🌐 Universal Website Search & Browser Automation
- **Website Registry**: Reusable registry routing commands directly to:
  - **YouTube**: `"Nova, search YouTube for Python tutorials"`
  - **Google**: `"Nova, search Google for Java interview questions"`
  - **GitHub**: `"Nova, find React projects on GitHub"`
  - **LinkedIn**: `"Nova, open LinkedIn"`
  - **Wikipedia**: `"Nova, search Wikipedia for Artificial intelligence"`
  - **Stack Overflow**: `"Nova, search Stack Overflow for Spring Boot errors"`
  - **Gmail**: `"Nova, open Gmail"`
  - **ChatGPT**: `"Nova, open ChatGPT"`
  - **Custom Websites**: `"Nova, open fastapitiangolo.com"`
- **Popup-Blocker Resilience**: Synchronous tab pre-opening during click/submit events with automatic navigation upon API response. Clickable fallback buttons provided for voice-triggered searches.

### 3. 🖥️ Windows Desktop Automation (Local PC)
- **Local Process Automation**: Safe subprocess execution of verified Windows applications using an allowlist:
  - `"Nova, open Notepad"`
  - `"Nova, open Calculator"`
  - `"Nova, open File Explorer"`
  - `"Nova, open Downloads"`
  - `"Nova, open Documents"`
  - `"Nova, open VS Code"`
  - `"Nova, open Chrome"`
- **Safety Allowlist**: Rejects arbitrary shell execution; only permitted application keys are launched.

### 4. 📝 Windows Notepad Voice Automation
- **Direct Dictation**: Automatically saves notes to disk and launches Windows Notepad:
  - `"Nova, put a note: 5 rice"`
  - `"Nova, write a note: Buy milk tomorrow"`
  - `"Nova, open Notepad and write Hello World"`
  - `"Nova, save a note: Complete my assignment"`
- **Approved Storage**: Generates timestamped UTF-8 `.txt` files in `~/Documents/NovaNotes/`.
- **Database & UI Synchronization**: Syncs note metadata into SQLite and displays notes in the React Notes workspace with search, editing, and deletion confirmation modals.

### 5. 💬 WhatsApp Communication Assistant
- **Contacts Directory**: User-managed contacts store with validated phone numbers, relationships, and email addresses.
- **Natural-Language Messaging**:
  - *"Nova, prepare a WhatsApp message to Devni saying I'm fine."*
  - *"Nova, send Devni a message saying I'll call later."*
  - *"Nova, open my WhatsApp conversation with Devni."*
- **Official Click-to-Chat**: Uses official WhatsApp Click-to-Chat (`https://wa.me/<digits>?text=...`) and desktop app URI (`whatsapp://send?phone=...`).
- **Safety First**: Never claims a message was sent without verification; pre-fills the message and gives the user full control to review and send.

### 6. ✉️ Smart Email Assistant
- **AI-Powered Email Drafting**: Groq-generated professional emails with concise, polished subject lines and structured bodies:
  - *"Nova, draft an email to my lecturer regarding assignment extension."*
  - *"Nova, write an email requesting an internship."*
  - *"Nova, prepare an email saying I cannot attend tomorrow."*
- **Composition Integration**: Generates prefilled `mailto:` and Gmail Web Compose URLs.
- **Interactive Review**: Displays editable draft in the Action Execution Panel before opening the client.

### 7. 📋 Smart Task Management & Reminders
- **Persistent Tasks**: Full CRUD operations stored in SQLite database.
- **Priority & Due Dates**: Categorization by `high`, `medium`, and `low` priority with categories and deadlines.
- **Natural-Language Reminders**:
  - *"Nova, remind me tomorrow at 8 PM to study Java"*
  - *"Nova, remind me to submit my report by tomorrow"*
- **Browser Reminders**: Desktop browser notifications for scheduled tasks.

### 8. 🧠 Intelligent AI Chat with Groq
- **Ultra-Fast LLM**: Powered by Groq Cloud (`openai/gpt-oss-120b`).
- **Server-Sent Events (SSE)**: Real-time token streaming for instantaneous response perception.
- **Rich Markdown Rendering**: Syntax highlighting for code blocks with language tags and copy-to-clipboard buttons.

### 9. 📄 AI Document Assistant
- **Multi-Format Extraction**: Text parsing for PDF (`pypdf`), Word documents (`python-docx`), and plain text/markdown.
- **AI Document Summaries**: Instant Groq AI document summarization.
- **Verbatim Citations**: Answers questions about uploaded documents with exact citation references.

### 10. 🗃️ Memory & Conversation History
- **Persistent Threads**: View, search, rename, and delete conversation threads.
- **Long-Term Memory**: Nova stores user preferences and personal context across sessions, with management endpoints to view or remove memories.

### 11. ⚡ Action Execution Engine & Multi-Step Planner
- **Action Execution Panel HUD**: Live status tracker displaying planned steps, progress badges, and confirmation triggers.
- **Sequential Execution Pipeline**:
  - *"Nova, search for Python tutorials and save the search link"* (Search + Notepad note)
  - *"Nova, search YouTube for React tutorials, save the search link in Notepad, and remind me tomorrow"* (Search + Note + Reminder)

### 12. 🎨 Professional Cyber-Luxe UI (10 Workspaces)
1. **Dashboard**: Live telemetry on conversations, voice vs typed usage, tasks progress, and latency.
2. **AI Chat**: Conversational canvas with streaming, Action Execution HUD, and quick actions.
3. **Voice Assistant**: Immersive voice stage with 3D Voice Orb, live interim transcript, and interrupt controls.
4. **Tasks**: Database-backed task manager with priorities, due dates, and reminder triggers.
5. **Notes**: Saved notes grid, search, and "Open in Windows Notepad" actions.
6. **Documents**: Document upload, AI summarization, and citation Q&A.
7. **Contacts**: Personal directory with phone numbers, relationships, and instant WhatsApp / Email triggers.
8. **Conversation History**: Searchable archive of past dialogue threads.
9. **Activity**: Real-time telemetry and audit feed of tool executions.
10. **Settings**: Voice speed slider, TTS voice selector, theme toggle, desktop automation switch, and data export.

---

## 🏛️ Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │      React 18 + Vite Frontend        │
                      │  - 9 Cyber-Luxe Workspaces           │
                      │  - Voice Orb & Speech Recognition    │
                      │  - Web Speech TTS Audio Controller   │
                      │  - Synchronous Tab Pre-Opening       │
                      └──────────────────┬───────────────────┘
                                         │  HTTP / SSE
                                         ▼
                      ┌──────────────────────────────────────┐
                      │          FastAPI Backend             │
                      │  - Reusable Website Command Router   │
                      │  - Windows Desktop Subprocess Engine │
                      │  - NovaNotes UTF-8 File Generator    │
                      │  - Multi-Step Sequential Planner     │
                      │  - JWT Bearer Authentication         │
                      └───────┬──────────────────────┬───────┘
                              │                      │
             ┌────────────────▼────────┐    ┌────────▼────────────────┐
             │     Groq Cloud AI       │    │     SQLite Database     │
             │ - Llama / GPT-OSS Engine│    │ - Users & Auth          │
             │ - Token Streaming (SSE) │    │ - Tasks & Reminders     │
             │ - Multi-Turn Context    │    │ - Notes & Document Recs │
             │ - Citation Extraction   │    │ - Long-Term Memories    │
             └─────────────────────────┘    └─────────────────────────┘
```

---

## 💻 Windows Local vs Cloud Deployment

| Feature | Local Windows PC | Deployed Web App |
|:---|:---:|:---:|
| **Voice Recognition & Speech Synthesis** | ✅ | ✅ (Browser dependent) |
| **Groq AI Chat & Streaming** | ✅ | ✅ |
| **Universal Website Search** | ✅ | ✅ |
| **Tasks & Reminders** | ✅ | ✅ |
| **Document Intelligence (PDF/DOCX)** | ✅ | ✅ |
| **Windows Desktop Automation (Calculator, Explorer, etc.)** | ✅ | ❌ (Requires local PC) |
| **Windows Notepad Note Automation (`~/Documents/NovaNotes`)** | ✅ | ❌ (Requires local PC) |

---

## 🚀 Windows Setup (PowerShell)

### Prerequisites
- **Windows 10 or 11**
- **Python 3.10+** (Python 3.11, 3.12, 3.13, or 3.14)
- **Node.js 18+** (Node.js 20+ or 24+ recommended)
- **Groq API Key**: Obtain a free API key at [console.groq.com](https://console.groq.com)

---

### Terminal 1 — Backend (FastAPI)
```powershell
# Navigate to the backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install required dependencies
pip install -r requirements.txt

# Configure your environment
cp .env.example .env
# Edit backend/.env and enter your GROQ_API_KEY

# Start the backend server on port 8000
python -m uvicorn app.main:app --reload --port 8000
```
- API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Root Status: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

---

### Terminal 2 — Frontend (React + Vite)
```powershell
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
- Open your browser at: [http://localhost:5173/](http://localhost:5173/)

---

## 🧪 Automated Testing

### Verified JARVIS Workflows (End-to-End)

| # | Test Command | Action Type | Result Status | Live Output |
|:---:|:---|:---:|:---:|:---|
| **1** | `"Nova, open YouTube."` | `open_url` | ✅ VERIFIED PASS | Opens `https://www.youtube.com` |
| **2** | `"Nova, search Google for React tutorials."` | `open_url` | ✅ VERIFIED PASS | Opens Google search with encoded query |
| **3** | `"Nova, open Calculator."` | `desktop_open` | ✅ VERIFIED PASS | Launches Windows Calculator via safe subprocess |
| **4** | `"Nova, write a note: Buy 5 kg of rice."` | `desktop_open` | ✅ VERIFIED PASS | Saves UTF-8 `.txt` to `~/Documents/NovaNotes/` and opens Notepad |
| **5** | `"Nova, prepare a WhatsApp message to Devni saying I'm fine."` | `whatsapp_prepare` | ✅ VERIFIED PASS | Generates WhatsApp Click-to-Chat URL with recipient matching |
| **6** | `"Nova, remind me tomorrow at 8 PM to study Java."` | `reminder_created` | ✅ VERIFIED PASS | Creates task for Tomorrow at 8:00 PM with notification trigger |
| **7** | `"Nova, search for Python tutorials and save the search link."` | `open_url` + `desktop_open` | ✅ VERIFIED PASS | Executes multi-step plan: searches web and saves link to Notepad |
| **8** | `"Nova, explain polymorphism in Java."` | `ai` | ✅ VERIFIED PASS | Streams Groq AI explanation with syntax-highlighted code |

### Backend Unit Test Suite (33 Tests)
Covers authentication, universal website routing, Windows desktop allowlist, Notepad voice note creation, WhatsApp Click-to-Chat, smart email drafting, natural-language reminders, multi-step action planner, contacts directory CRUD, tasks CRUD, document extraction, and analytics:
```powershell
$env:PYTHONPATH="backend"
backend\venv\Scripts\python -m unittest discover -s backend\tests
```
*(All 33 test suites pass).*

### Frontend Test Suite (13 Tests)
Verifies wake-word extraction, action URL formatting, deduplication algorithms, structured `open_url` unwrapping, navigation intent detection, WhatsApp Click-to-Chat number normalization, Email draft mailto encoding, multi-step action status recognition, and SSE streaming parsers:
```powershell
cd frontend
npm test
```
*(All 13 frontend tests pass).*

### Production Compilation
```powershell
cd frontend
npm run build
```

---

## 🔧 Troubleshooting Guide

| Issue | Cause | Resolution |
|:---|:---|:---|
| **"Cannot reach the backend"** | FastAPI server not running or wrong port | Verify `uvicorn app.main:app --port 8000` is running in Terminal 1. Click "Retry Connection" in the header. |
| **Popup blocked when opening websites** | Browser popup blockers blocking asynchronous tabs | Click the direct `[Open Search Results ↗]` button. For typed commands, Nova synchronously pre-opens tabs to bypass this automatically. |
| **"Desktop automation is only available on Windows"** | Executing on non-Windows environment | Desktop automation (Notepad, Calculator, Explorer) is designed specifically for local Windows environments. |
| **Microphone not responding** | Browser permission blocked | Check browser address bar for the microphone permission icon and set it to "Allow". Chrome or Edge is required. |
| **SSL Certificate Verify Failed on Weather** | Windows antivirus or proxy interception | Nova includes built-in SSL fallback (`verify=False`) to ensure requests succeed across corporate firewalls. |

---

## 📜 License
This project is open-source under the MIT License.
