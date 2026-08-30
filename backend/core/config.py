import os
from pathlib import Path

from dotenv import load_dotenv

CORE_DIR = Path(__file__).resolve().parent
BASE_DIR = CORE_DIR.parent

load_dotenv(BASE_DIR / ".env")

# =============================
# AUTH
# =============================

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
    raise RuntimeError(
        "JWT_SECRET_KEY doit être défini dans l'environnement avec au moins 32 caractères. "
        "Générer une valeur avec : python -c \"import secrets; print(secrets.token_urlsafe(32))\""
    )

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8h

# ============================================================
# PROVIDER : "gemini" ou "ollama"
# ============================================================
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()

# --- Gemini ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-2.0-flash")

LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "10000"))

# --- Ollama ---
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_NUM_CTX = int(os.getenv("OLLAMA_NUM_CTX", "8192"))  # à augmenter selon tes prompts

# --- Commun ---
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.0"))
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "60"))  # secondes
LLM_RETRY_ATTEMPTS = int(os.getenv("LLM_RETRY_ATTEMPTS", "3"))

# =============================
# API
# =============================

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
API_DEBUG = os.getenv("API_DEBUG", "False").lower() == "true"

# =============================
# PostgreSQL
# =============================

PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = int(os.getenv("PG_PORT", "5432"))
PG_USER = os.getenv("PG_USER")
PG_PASSWORD = os.getenv("PG_PASSWORD")
PG_DATABASE = os.getenv("PG_DATABASE")

# =============================
# IMAP (lecture des emails)
# =============================

IMAP_EMAIL = os.getenv("IMAP_EMAIL")
IMAP_PASSWORD = os.getenv("IMAP_PASSWORD")
IMAP_SERVER = os.getenv("IMAP_SERVER")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))

# =============================
# SMTP (envoi des emails)
# =============================

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

# =============================
# Storage
# =============================

DATA_DIR = BASE_DIR / "data"
AO_DATA_DIR = DATA_DIR / "input"
G_PDF_DATA_DIR = DATA_DIR / "Generer_PDF"
R_DATA_DIR = DATA_DIR / "Responses"

# =============================
# Semantic
# =============================

EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "intfloat/multilingual-e5-small")
_embedding_cache = Path(os.getenv("EMBEDDING_CACHE_DIR", "data/models"))
EMBEDDING_CACHE_DIR = (
    _embedding_cache
    if _embedding_cache.is_absolute()
    else BASE_DIR / _embedding_cache
)
EMBEDDING_LOCAL_FILES_ONLY = (
    os.getenv("EMBEDDING_LOCAL_FILES_ONLY", "false").lower() == "true"
)
SEMANTIC_TOP_N = int(os.getenv("SEMANTIC_TOP_N", "5"))

# ============================================================
# LangSmith (optionnel)
# ============================================================

# Les variables LANGSMITH_* sont les noms canoniques actuels. Les anciennes
# variables LANGCHAIN_* restent acceptées afin de ne pas casser un .env local
# existant.
LANGSMITH_TRACING = (
    os.getenv("LANGSMITH_TRACING", os.getenv("LANGCHAIN_TRACING_V2", "false"))
    .lower()
    == "true"
)
LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY", os.getenv("LANGCHAIN_API_KEY", ""))
LANGSMITH_PROJECT = os.getenv(
    "LANGSMITH_PROJECT", os.getenv("LANGCHAIN_PROJECT", "tendering-ia")
)

# Normalisation pour que LangChain et le plugin pytest LangSmith voient la
# même configuration, même lorsque le fichier .env emploie les anciens noms.
os.environ.setdefault("LANGSMITH_TRACING", str(LANGSMITH_TRACING).lower())
os.environ.setdefault("LANGSMITH_PROJECT", LANGSMITH_PROJECT)
if LANGSMITH_API_KEY:
    os.environ.setdefault("LANGSMITH_API_KEY", LANGSMITH_API_KEY)

# Alias conservés pour les imports historiques du projet.
LANGCHAIN_TRACING_V2 = LANGSMITH_TRACING
LANGCHAIN_API_KEY = LANGSMITH_API_KEY
LANGCHAIN_PROJECT = LANGSMITH_PROJECT


OCR_MAX_WORKERS = int(os.getenv("OCR_MAX_WORKERS", "2"))
