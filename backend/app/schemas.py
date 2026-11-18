from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    conversation_id: Optional[int] = None


class SourceItem(BaseModel):
    source: str
    page: int
    excerpt: str


class ChatResponse(BaseModel):
    conversation_id: int
    answer: str
    sources: list[SourceItem]


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: Optional[list[SourceItem]] = None
    created_at: datetime


class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse] = []


class PDFResponse(BaseModel):
    filename: str
    size_bytes: int
    indexed: bool


class QuizRequest(BaseModel):
    topic: str = Field(default="Operating Systems", min_length=2, max_length=200)
    count: int = Field(default=5, ge=1, le=10)


class QuizOption(BaseModel):
    text: str


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str
    explanation: str


class QuizResponse(BaseModel):
    topic: str
    questions: list[QuizQuestion]
