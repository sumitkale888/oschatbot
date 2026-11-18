# AI Operating System Chatbot Backend

FastAPI backend with RAG retrieval from PDF documents, Gemini answer generation, SQLite chat history, PDF management, and a quiz API.

## Requirements

- Python 3.11+
- A Gemini API key

## Setup

```powershell
cd C:\Users\kales\Documents\oschatbot\backend
.\venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Put the API key in `backend/.env`:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
EMBEDDING_MODEL=models/gemini-embedding-001
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Run the backend:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Open the interactive API documentation at `http://127.0.0.1:8001/docs`. The frontend talks to this port by default.

The existing `backend/data/osbook.pdf` is indexed automatically at startup. Uploads and re-indexing are available through `/api/pdfs`.

## API Summary

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend and configuration status |
| POST | `/api/chat` | Ask a question and optionally continue a conversation |
| GET | `/api/history` | List conversations |
| GET | `/api/history/{id}` | View one conversation |
| DELETE | `/api/history/{id}` | Delete one conversation |
| DELETE | `/api/history` | Clear all chat history |
| GET | `/api/pdfs` | List PDF knowledge documents |
| POST | `/api/pdfs/upload` | Upload and index a PDF |
| POST | `/api/pdfs/reindex` | Re-index all PDFs |
| DELETE | `/api/pdfs/{filename}` | Delete a PDF and its vectors |
| POST | `/api/quiz/generate` | Generate an operating-system quiz |

Example chat request:

```json
{
  "question": "What is a process?",
  "conversation_id": null
}
```
