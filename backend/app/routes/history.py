import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Conversation
from ..schemas import ConversationResponse, MessageResponse, SourceItem
from ..services.history_service import clear_history, delete_conversation

router = APIRouter(prefix="/api/history", tags=["history"])


def serialize(conversation: Conversation) -> ConversationResponse:
    message_responses = []
    for message in conversation.messages:
        sources = None
        if message.sources:
            try:
                sources = [SourceItem(**item) for item in json.loads(message.sources)]
            except (json.JSONDecodeError, TypeError):
                sources = None
        message_responses.append(MessageResponse(
            id=message.id,
            role=message.role,
            content=message.content,
            sources=sources,
            created_at=message.created_at,
        ))
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=message_responses,
    )


@router.get("", response_model=list[ConversationResponse])
def list_history(db: Session = Depends(get_db)):
    conversations = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    return [serialize(conversation) for conversation in conversations]


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_history(conversation_id: int, db: Session = Depends(get_db)):
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return serialize(conversation)


@router.delete("/{conversation_id}")
def remove_history(conversation_id: int, db: Session = Depends(get_db)):
    if not delete_conversation(db, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"deleted": True, "conversation_id": conversation_id}


@router.delete("")
def remove_all_history(db: Session = Depends(get_db)):
    count = clear_history(db)
    return {"deleted": True, "conversations_deleted": count}
