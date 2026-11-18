import json
from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..models import Conversation, Message


def create_or_get_conversation(db: Session, conversation_id: int | None, question: str) -> Conversation:
    conversation = db.get(Conversation, conversation_id) if conversation_id else None
    if conversation:
        return conversation
    title = " ".join(question.strip().split())[:80]
    conversation = Conversation(title=title)
    db.add(conversation)
    db.flush()
    return conversation


def add_message(db: Session, conversation: Conversation, role: str, content: str, sources=None) -> Message:
    message = Message(
        conversation_id=conversation.id,
        role=role,
        content=content,
        sources=json.dumps(sources) if sources else None,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def delete_conversation(db: Session, conversation_id: int) -> bool:
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        return False
    db.delete(conversation)
    db.commit()
    return True


def clear_history(db: Session) -> int:
    count = db.query(Conversation).count()
    db.execute(delete(Message))
    db.execute(delete(Conversation))
    db.commit()
    return count
