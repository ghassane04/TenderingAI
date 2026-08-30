import asyncio
import json
import logging

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama

from core.config import (
    LLM_PROVIDER,
    LLM_MODEL,
    GEMINI_API_KEY,
    LLM_TEMPERATURE,
    LLM_TIMEOUT,
    LLM_RETRY_ATTEMPTS,
    OLLAMA_MODEL,
    OLLAMA_BASE_URL,
    OLLAMA_NUM_CTX,
)
from schemas.tender_metadata_schema import TenderMetadata
from schemas.tender_process_schema import TenderRequirementsContainer
from schemas.datasheet_process_schema import ExtractionFicheFournisseur
from schemas.comparison_schema import ComparaisonTechnique
from .prompts import (
    EXTRACTION_INFO_PROMPT,
    EXTRACTION_REQUIREMENT_PROMPT,
    EXTRACTION_TECHNICAL_PROMPT,
    COMPARISON_PROMPT,
)

logger = logging.getLogger(__name__)

# EXCEPTION MÉTIER

class LLMExtractionError(Exception):
    """Levée quand un appel LLM échoue définitivement (après retries)."""
    def __init__(self, step: str, original: Exception):
        self.step = step
        self.original = original
        super().__init__(f"[{step}] LLM call failed: {original!r}")


# EXCEPTIONS "RETRYABLES" (erreurs transitoires uniquement)
# On ne retry jamais sur une erreur de config (clé API absente),
# de validation Pydantic, ou de schéma — retenter ne changerait rien.

_RETRYABLE_EXCEPTIONS: tuple[type[Exception], ...] = (
    TimeoutError,
    ConnectionError,
)

try:
    from google.api_core.exceptions import (
        ResourceExhausted,      # rate limit
        ServiceUnavailable,     # 503
        DeadlineExceeded,       # timeout côté API
        InternalServerError,    # 500
    )
    _RETRYABLE_EXCEPTIONS += (
        ResourceExhausted,
        ServiceUnavailable,
        DeadlineExceeded,
        InternalServerError,
    )
except ImportError:
    pass

try:
    import httpx
    _RETRYABLE_EXCEPTIONS += (httpx.TimeoutException, httpx.ConnectError)
except ImportError:
    pass


# INITIALISATION DU LLM (singleton, thread/task-safe, provider switchable)

_llm: ChatGoogleGenerativeAI | ChatOllama | None = None
_llm_lock = asyncio.Lock()


async def get_llm() -> ChatGoogleGenerativeAI | ChatOllama:
    """
    Retourne une instance singleton du LLM, Gemini ou Ollama selon LLM_PROVIDER.
    Protégée par un asyncio.Lock (double-checked locking) contre la double init.
    """
    global _llm
    if _llm is None:
        async with _llm_lock:
            if _llm is None:
                if LLM_PROVIDER == "gemini":
                    if not GEMINI_API_KEY:
                        raise ValueError("GEMINI_API_KEY not configured")
                    logger.info("Initializing Gemini LLM (model=%s)", LLM_MODEL)
                    _llm = ChatGoogleGenerativeAI(
                        model=LLM_MODEL,
                        google_api_key=GEMINI_API_KEY,
                        temperature=LLM_TEMPERATURE,
                        timeout=LLM_TIMEOUT,
                    )
                elif LLM_PROVIDER == "ollama":
                    logger.info(
                        "Initializing Ollama LLM (model=%s, base_url=%s, num_ctx=%d)",
                        OLLAMA_MODEL, OLLAMA_BASE_URL, OLLAMA_NUM_CTX,
                    )
                    _llm = ChatOllama(
                        model=OLLAMA_MODEL,
                        base_url=OLLAMA_BASE_URL,
                        temperature=LLM_TEMPERATURE,
                        num_ctx=OLLAMA_NUM_CTX,
                        # Qwen 3 active son mode de raisonnement par défaut. Il
                        # est inutile pour nos sorties JSON/Pydantic et peut
                        # ajouter du texte avant le JSON, donc on le désactive.
                        reasoning=False,
                        timeout=LLM_TIMEOUT,
                    )
                else:
                    raise ValueError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER!r}")
    return _llm


def _build_chain(prompt: ChatPromptTemplate, structured_llm):
    """Construit une chaîne avec retry restreint aux erreurs transitoires."""
    return (prompt | structured_llm).with_retry(
        stop_after_attempt=LLM_RETRY_ATTEMPTS,
        retry_if_exception_type=_RETRYABLE_EXCEPTIONS,
    )


# FONCTIONS D'EXTRACTION

async def extract_tender_info(document_text: str) -> TenderMetadata:
    """
    Analyse le texte et retourne directement un objet Pydantic TenderMetadata (Asynchrone).
    """
    step = "extract_tender_info"
    logger.info("[%s] start (document_text_len=%d)", step, len(document_text))

    llm = await get_llm()
    structured_llm = llm.with_structured_output(TenderMetadata)
    chain = _build_chain(EXTRACTION_INFO_PROMPT, structured_llm)

    try:
        result: TenderMetadata = await chain.ainvoke({"document_text": document_text})
    except Exception as exc:
        logger.exception("[%s] failed after retries", step)
        raise LLMExtractionError(step, exc) from exc

    logger.info("[%s] success (code=%r)", step, getattr(result, "code", None))
    return result


async def extract_tender_products(
    chunk: str,
    previous_chunk: str | None,
    previous_product_name: str | None,
    technical_lots: list[dict] | None = None,
) -> TenderRequirementsContainer:
    """
    Invoque la chaîne LangChain pour extraire les exigences et retourne l'objet Pydantic typé (Asynchrone).
    """
    step = "extract_tender_products"
    logger.info("[%s] start (chunk_len=%d)", step, len(chunk))

    llm = await get_llm()
    structured_llm = llm.with_structured_output(TenderRequirementsContainer)
    chain = _build_chain(EXTRACTION_REQUIREMENT_PROMPT, structured_llm)

    try:
        result: TenderRequirementsContainer = await chain.ainvoke({
            "chunk": chunk,
            "previous_chunk": previous_chunk or "No previous content.",
            "previous_product_name": previous_product_name or "Aucun produit",
            "technical_lots": json.dumps(technical_lots or [], ensure_ascii=False, indent=2),
        })
    except Exception as exc:
        logger.exception("[%s] failed after retries", step)
        raise LLMExtractionError(step, exc) from exc

    logger.info("[%s] success (%d produits)", step, len(result.produits))
    return result


async def extract_supplier_products(
    chunk: str,
    previous_chunk: str | None = None,
    previous_product_name: str | None = None,
) -> ExtractionFicheFournisseur:
    step = "extract_supplier_products"
    logger.info("[%s] start (chunk_len=%d)", step, len(chunk))

    llm = await get_llm()
    structured_llm = llm.with_structured_output(ExtractionFicheFournisseur)
    chain = _build_chain(EXTRACTION_TECHNICAL_PROMPT, structured_llm)

    try:
        result: ExtractionFicheFournisseur = await chain.ainvoke({
            "chunk": chunk,
            "previous_chunk": previous_chunk or "(none — this is the first chunk)",
            "previous_product_name": previous_product_name or "Aucun produit",
        })
    except Exception as exc:
        logger.exception("[%s] failed after retries", step)
        raise LLMExtractionError(step, exc) from exc

    logger.info("[%s] success", step)
    return result

async def compare_requirements_with_characteristics(
    requirements: list[dict],
    technicals: list[dict],
) -> ComparaisonTechnique:
    """
    Compare les exigences techniques du tender avec les caractéristiques
    extraites de la fiche fournisseur (Asynchrone).
    """
    step = "compare_requirements_with_characteristics"
    logger.info(
        "[%s] start (%d requirements, %d technicals)",
        step, len(requirements), len(technicals),
    )

    llm = await get_llm()
    structured_llm = llm.with_structured_output(ComparaisonTechnique)
    chain = _build_chain(COMPARISON_PROMPT, structured_llm)

    try:
        result: ComparaisonTechnique = await chain.ainvoke({
            "requirements": json.dumps(requirements, ensure_ascii=False, indent=2),
            "technicals": json.dumps(technicals, ensure_ascii=False, indent=2),
        })
    except Exception as exc:
        logger.exception("[%s] failed after retries", step)
        raise LLMExtractionError(step, exc) from exc

    logger.info("[%s] success", step)
    return result
