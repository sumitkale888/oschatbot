import json
import logging
from pathlib import Path
from threading import Lock

from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..config import get_gemini_api_key, settings

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self) -> None:
        self._lock = Lock()
        self._vectorstore = None
        self._last_index_error = None
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        settings.chroma_dir.mkdir(parents=True, exist_ok=True)

    def _embeddings(self):
        api_key = get_gemini_api_key()
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        return GoogleGenerativeAIEmbeddings(
            model=settings.embedding_model,
            google_api_key=api_key,
        )

    def _model(self):
        api_key = get_gemini_api_key()
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=api_key,
            temperature=0.2,
        )

    @staticmethod
    def _response_text(response) -> str:
        content = getattr(response, "content", response)
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for block in content:
                if isinstance(block, str):
                    parts.append(block)
                elif isinstance(block, dict):
                    text = block.get("text")
                    if isinstance(text, str):
                        parts.append(text)
            if parts:
                return "\n".join(parts)
        return str(content)

    def get_vectorstore(self):
        if self._vectorstore is None:
            self._vectorstore = Chroma(
                collection_name="os_knowledge",
                embedding_function=self._embeddings(),
                persist_directory=str(settings.chroma_dir),
            )
        return self._vectorstore

    def index_pdf(self, pdf_path: Path) -> int:
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path.name}")
        with self._lock:
            embeddings = self._embeddings()
            vectorstore = Chroma(
                collection_name="os_knowledge",
                embedding_function=embeddings,
                persist_directory=str(settings.chroma_dir),
            )
            self._vectorstore = vectorstore
            try:
                vectorstore.delete(where={"source": pdf_path.name})
            except Exception:
                pass

            documents = PyPDFLoader(str(pdf_path)).load()
            if not documents:
                raise ValueError("The PDF contains no readable text")

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""],
            )
            chunks = splitter.split_documents(documents)
            for chunk in chunks:
                chunk.metadata["source"] = pdf_path.name
                chunk.metadata["page"] = int(chunk.metadata.get("page", 0)) + 1

            if chunks:
                vectorstore.add_documents(chunks)
            return len(chunks)

    def has_index(self) -> bool:
        try:
            import chromadb

            client = chromadb.PersistentClient(path=str(settings.chroma_dir))
            names = {collection.name for collection in client.list_collections()}
            if "os_knowledge" not in names:
                return False
            return client.get_collection("os_knowledge").count() > 0
        except Exception as exc:
            logger.warning("Could not inspect knowledge index: %s", exc)
            return False

    def index_all(self, force: bool = False) -> dict[str, int]:
        if not get_gemini_api_key():
            self._last_index_error = "GEMINI_API_KEY is not configured"
            logger.warning(self._last_index_error)
            return {}

        if not force and self.has_index():
            logger.info("Knowledge index already present; skipping startup reindex")
            return {}

        result = {}
        for pdf_path in sorted(settings.data_dir.glob("*.pdf")):
            try:
                result[pdf_path.name] = self.index_pdf(pdf_path)
            except Exception as exc:
                self._last_index_error = str(exc)
                logger.error("Could not index %s: %s", pdf_path.name, exc)
        return result

    def delete_pdf(self, filename: str) -> None:
        pdf_path = settings.data_dir / filename
        if pdf_path.exists():
            pdf_path.unlink()
        try:
            vectorstore = self.get_vectorstore()
            vectorstore.delete(where={"source": filename})
        except Exception as exc:
            logger.error("Could not remove vectors for %s: %s", filename, exc)

    def retrieve(self, question: str):
        if not get_gemini_api_key():
            raise RuntimeError("GEMINI_API_KEY is not configured")
        vectorstore = self.get_vectorstore()
        return vectorstore.similarity_search(question, k=settings.retrieval_k)

    def answer(self, question: str) -> tuple[str, list[dict]]:
        try:
            documents = self.retrieve(question)
        except Exception as exc:
            logger.warning("RAG retrieval failed; using Gemini general knowledge: %s", exc)
            documents = []
        if not documents:
            prompt = (
                "You are KernelMate, an Operating Systems tutor. "
                "No relevant text was found in the uploaded PDF knowledge base. "
                "Answer the user's question from your general Operating Systems knowledge. "
                "Explain in simple language, use short numbered steps when useful, "
                "and clearly say: 'This answer was not found in the uploaded documents.'\n\n"
                f"QUESTION:\n{question}"
            )
            response = self._model().invoke(prompt)
            answer = self._response_text(response)
            return answer, []

        context = "\n\n".join(
            f"[Source: {doc.metadata.get('source', 'unknown')}, "
            f"Page: {doc.metadata.get('page', 'unknown')}]\n{doc.page_content}"
            for doc in documents
        )
        prompt = (
            "You are an Operating System tutor. Use only the supplied context. "
            "Explain in simple language, use short numbered steps for procedures, "
            "and mention source document and page where each idea comes from. "
            "If the context does not answer the question, say that clearly.\n\n"
            f"CONTEXT:\n{context}\n\nQUESTION:\n{question}"
        )
        response = self._model().invoke(prompt)
        answer = self._response_text(response)

        sources = []
        seen = set()
        for doc in documents:
            source = str(doc.metadata.get("source", "unknown"))
            page = int(doc.metadata.get("page", 0) or 0)
            key = (source, page)
            if key not in seen:
                seen.add(key)
                sources.append({
                    "source": source,
                    "page": page,
                    "excerpt": doc.page_content[:280].strip(),
                })
        return answer, sources

    @staticmethod
    def _parse_quiz_payload(text: str) -> list:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        try:
            payload = json.loads(cleaned)
        except json.JSONDecodeError:
            start, end = cleaned.find("["), cleaned.rfind("]")
            if start == -1 or end <= start:
                return []
            try:
                payload = json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError:
                return []
        if isinstance(payload, dict):
            payload = payload.get("questions") or payload.get("quiz") or []
        return payload if isinstance(payload, list) else []

    @staticmethod
    def _normalize_quiz_item(raw) -> dict | None:
        if not isinstance(raw, dict):
            return None
        options_raw = raw.get("options") or []
        options = []
        for option in options_raw:
            if isinstance(option, str):
                text = option.strip()
            elif isinstance(option, dict):
                text = str(option.get("text") or option.get("option") or "").strip()
            else:
                text = str(option).strip()
            if text:
                options.append(text)
        if len(options) < 2:
            return None

        answer = raw.get("answer", raw.get("correct_answer"))
        if isinstance(answer, int) and 0 <= answer < len(options):
            answer = options[answer]
        elif isinstance(answer, str):
            answer = answer.strip()
            if len(answer) == 1 and answer.upper() in "ABCD"[:len(options)]:
                answer = options[ord(answer.upper()) - 65]
            else:
                match = next((item for item in options if item.lower() == answer.lower()), None)
                answer = match or answer
        if answer not in options:
            return None

        question = str(raw.get("question") or "").strip()
        explanation = str(raw.get("explanation") or "").strip() or "Review this operating-systems concept in your notes."
        if not question:
            return None
        return {
            "question": question,
            "options": options[:4],
            "answer": answer,
            "explanation": explanation,
        }

    def generate_quiz(self, topic: str, count: int) -> list[dict]:
        context = ""
        try:
            documents = self.retrieve(topic)
            context = "\n\n".join(doc.page_content for doc in documents)[:12000]
        except Exception as exc:
            logger.warning("Quiz retrieval failed; generating from general OS knowledge: %s", exc)

        prompt = (
            f"Create {count} multiple-choice questions about {topic} for an Operating Systems course. "
            "Return valid JSON only as a list. Each item has: "
            "'question', 'options' (exactly 4 strings), 'answer' (the exact option text), "
            "'explanation'."
        )
        if context:
            prompt += f"\nPrefer this study context when possible:\n{context}"

        try:
            response = self._model().invoke(prompt)
        except Exception as exc:
            logger.warning("Quiz model call failed: %s", exc)
            return []

        questions = [
            item
            for item in (self._normalize_quiz_item(raw) for raw in self._parse_quiz_payload(self._response_text(response)))
            if item
        ]
        return questions[:count]


rag_service = RAGService()
