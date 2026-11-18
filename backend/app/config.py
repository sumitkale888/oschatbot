from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import dotenv_values


BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"
    embedding_model: str = "models/gemini-embedding-001"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    data_dir: Path = BACKEND_DIR / "data"
    chroma_dir: Path = BACKEND_DIR / "chroma_db"
    database_url: str = f"sqlite:///{BACKEND_DIR / 'chat_history.db'}"
    chunk_size: int = 1000
    chunk_overlap: int = 150
    retrieval_k: int = 5

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


def get_gemini_api_key() -> str:
    env_values = dotenv_values(BACKEND_DIR / ".env")
    return (
        settings.gemini_api_key.strip()
        or env_values.get("GEMINI_API_KEY", "").strip()
    )
