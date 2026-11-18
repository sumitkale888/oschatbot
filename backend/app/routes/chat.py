import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import get_gemini_api_key
from ..database import get_db
from ..models import Conversation
from ..schemas import ChatRequest, ChatResponse, SourceItem
from ..services.rag_service import rag_service
from ..services.history_service import add_message, create_or_get_conversation

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if not get_gemini_api_key():
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    conversation = db.get(Conversation, request.conversation_id) if request.conversation_id else None
    if request.conversation_id and not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation = create_or_get_conversation(db, request.conversation_id, request.question)
    add_message(db, conversation, "user", request.question)

    try:
        answer, sources_data = rag_service.answer(request.question)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Knowledge retrieval or Gemini API failed: {exc}") from exc

    add_message(db, conversation, "assistant", answer, sources_data)
    sources = [SourceItem(**source) for source in sources_data]
    return ChatResponse(conversation_id=conversation.id, answer=answer, sources=sources)
