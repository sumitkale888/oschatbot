from fastapi import APIRouter
from . import chat, history, pdf, quiz


router = APIRouter()
router.include_router(chat.router)
router.include_router(history.router)
router.include_router(pdf.router)
router.include_router(quiz.router)
