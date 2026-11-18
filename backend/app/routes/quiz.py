import logging
from fastapi import APIRouter

from ..schemas import QuizRequest, QuizResponse, QuizQuestion
from ..services.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


FALLBACK_QUIZ = [
    {
        "question": "What is the main role of an operating system?",
        "options": [
            "Manage hardware and provide services to applications",
            "Only display a graphical interface",
            "Store every file forever",
            "Compile all applications",
        ],
        "answer": "Manage hardware and provide services to applications",
        "explanation": "An operating system manages resources and provides an interface for applications.",
    },
    {
        "question": "What is a process?",
        "options": [
            "A program in execution",
            "A permanent disk file",
            "A network cable",
            "A CPU register",
        ],
        "answer": "A program in execution",
        "explanation": "A process is a running instance of a program.",
    },
    {
        "question": "What is the purpose of virtual memory?",
        "options": [
            "To provide an address space larger than physical RAM",
            "To replace the CPU",
            "To format a disk",
            "To encrypt network traffic",
        ],
        "answer": "To provide an address space larger than physical RAM",
        "explanation": "Virtual memory combines RAM and secondary storage to give processes a larger address space.",
    },
    {
        "question": "What is a context switch?",
        "options": [
            "Saving and restoring process state when changing processes",
            "Deleting a file",
            "Installing an application",
            "Turning off a network adapter",
        ],
        "answer": "Saving and restoring process state when changing processes",
        "explanation": "A context switch preserves one process and restores another process on the CPU.",
    },
    {
        "question": "Which scheduling method uses a fixed time slice?",
        "options": ["Round Robin", "FCFS", "Shortest Job First", "Priority inversion"],
        "answer": "Round Robin",
        "explanation": "Round Robin gives each runnable process a fixed time slice.",
    },
    {
        "question": "What is a deadlock?",
        "options": [
            "Processes waiting indefinitely for resources held by each other",
            "A process that completed successfully",
            "A CPU cache miss",
            "A successful file transfer",
        ],
        "answer": "Processes waiting indefinitely for resources held by each other",
        "explanation": "Deadlock occurs when processes hold resources and wait for resources held by others.",
    },
    {
        "question": "What does a file system manage?",
        "options": [
            "Files, directories, names, and storage allocation",
            "Only CPU instructions",
            "Only network packets",
            "Only keyboard input",
        ],
        "answer": "Files, directories, names, and storage allocation",
        "explanation": "A file system organizes persistent data and manages file and directory metadata.",
    },
    {
        "question": "What is a system call?",
        "options": [
            "A controlled request from a program to the operating system",
            "A phone call from the kernel",
            "A hardware interrupt only",
            "A compiler command",
        ],
        "answer": "A controlled request from a program to the operating system",
        "explanation": "System calls let applications request operating-system services safely.",
    },
    {
        "question": "What is the purpose of paging?",
        "options": [
            "Divide virtual memory into fixed-size blocks",
            "Remove all device drivers",
            "Convert processes into threads",
            "Disable caching",
        ],
        "answer": "Divide virtual memory into fixed-size blocks",
        "explanation": "Paging divides virtual memory and physical memory into managed fixed-size blocks.",
    },
    {
        "question": "What is a semaphore used for?",
        "options": [
            "Synchronize processes or threads",
            "Compress PDF files",
            "Translate source code",
            "Increase disk capacity",
        ],
        "answer": "Synchronize processes or threads",
        "explanation": "Semaphores provide synchronization and resource-control mechanisms.",
    },
]


@router.post("/generate", response_model=QuizResponse)
def generate_quiz(request: QuizRequest):
    items = []
    try:
        items = rag_service.generate_quiz(request.topic, request.count) or []
    except Exception as exc:
        logger.warning("Quiz generation failed, using fallback questions: %s", exc)

    questions = []
    for item in items:
        try:
            questions.append(QuizQuestion(**item))
        except Exception:
            continue
        if len(questions) >= request.count:
            break

    if len(questions) < request.count:
        for item in FALLBACK_QUIZ:
            try:
                candidate = QuizQuestion(**item)
            except Exception:
                continue
            if any(existing.question == candidate.question for existing in questions):
                continue
            questions.append(candidate)
            if len(questions) >= request.count:
                break

    return QuizResponse(topic=request.topic, questions=questions[: request.count])
