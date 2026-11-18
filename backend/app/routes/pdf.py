from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..config import get_gemini_api_key, settings
from ..database import get_db
from ..schemas import PDFResponse
from ..services.rag_service import rag_service

router = APIRouter(prefix="/api/pdfs", tags=["pdfs"])


def safe_filename(filename: str) -> str:
    name = Path(filename).name
    if not name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    return name


@router.get("", response_model=list[PDFResponse])
def list_pdfs():
    result = []
    for pdf_path in sorted(settings.data_dir.glob("*.pdf")):
        result.append(PDFResponse(
            filename=pdf_path.name,
            size_bytes=pdf_path.stat().st_size,
            indexed=bool(get_gemini_api_key()),
        ))
    return result


@router.post("/upload", response_model=PDFResponse)
async def upload_pdf(file: UploadFile = File(...)):
    filename = safe_filename(file.filename or "")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded PDF is empty")
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF exceeds the 25 MB size limit")

    target = settings.data_dir / filename
    target.write_bytes(content)
    try:
        rag_service.index_pdf(target)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Could not process PDF: {exc}") from exc

    return PDFResponse(filename=filename, size_bytes=target.stat().st_size, indexed=True)


@router.post("/reindex")
def reindex_pdfs():
    if not get_gemini_api_key():
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")
    result = rag_service.index_all(force=True)
    return {"indexed": result}


@router.delete("/{filename}")
def delete_pdf(filename: str):
    filename = safe_filename(filename)
    pdf_path = settings.data_dir / filename
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")
    rag_service.delete_pdf(filename)
    return {"deleted": True, "filename": filename}
