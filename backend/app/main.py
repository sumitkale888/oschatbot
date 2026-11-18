from contextlib import asynccontextmanager
import logging
import os
from threading import Thread
from dotenv import dotenv_values
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import init_db
from .routes import router
from .services.rag_service import rag_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    Thread(target=_index_in_background, daemon=True).start()
    yield


def _index_in_background() -> None:
    try:
        rag_service.index_all()
    except Exception as exc:
        logging.getLogger(__name__).error("Startup indexing failed: %s", exc)


app = FastAPI(
    title="AI Operating System Chatbot",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/api/health")
def health():
    env_key = dotenv_values(settings.data_dir.parent / ".env").get("GEMINI_API_KEY")
    return {
        "status": "ok",
        "gemini_configured": bool(settings.gemini_api_key or os.getenv("GEMINI_API_KEY") or env_key),
        "pdf_count": len(list(settings.data_dir.glob("*.pdf"))),
    }
