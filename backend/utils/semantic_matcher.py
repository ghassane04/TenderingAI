import logging
from pathlib import Path

import numpy as np
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

from core.config import (
    EMBEDDING_CACHE_DIR,
    EMBEDDING_LOCAL_FILES_ONLY,
    EMBEDDING_MODEL_NAME,
    SEMANTIC_TOP_N,
)

logger = logging.getLogger(__name__)


class SemanticMatcher:
    """
    Matcher sémantique basé sur un modèle d'embedding local (HuggingFace /
    sentence-transformers), exécuté sur CPU. Singleton : le modèle n'est
    chargé qu'une seule fois en mémoire.
    """

    _instance: "SemanticMatcher | None" = None
    _embed_model: HuggingFaceEmbedding | None = None

    def __new__(cls) -> "SemanticMatcher":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def get_embed_model(cls) -> HuggingFaceEmbedding:
        if cls._embed_model is None:
            logger.info("Chargement du modèle d'embedding local : %s", EMBEDDING_MODEL_NAME)
            cache_dir = Path(EMBEDDING_CACHE_DIR)
            cache_dir.mkdir(parents=True, exist_ok=True)
            # Préfixes "query: " / "passage: " requis par la famille de modèles E5
            # pour une qualité de similarité correcte — à ne pas omettre.
            cls._embed_model = HuggingFaceEmbedding(
                model_name=EMBEDDING_MODEL_NAME,
                cache_folder=str(cache_dir),
                local_files_only=EMBEDDING_LOCAL_FILES_ONLY,
                query_instruction="query: ",
                text_instruction="passage: ",
            )
        return cls._embed_model

    @staticmethod
    def _cosine_similarity(query_vector: np.ndarray, candidate_vectors: np.ndarray) -> np.ndarray:
        query_norm = np.linalg.norm(query_vector)
        candidate_norms = np.linalg.norm(candidate_vectors, axis=1)

        denom = query_norm * candidate_norms
        denom[denom == 0] = 1e-10

        dot_products = candidate_vectors @ query_vector
        return dot_products / denom

    def find_top_matches(
        self,
        query_text: str,
        candidates: list[dict],
        top_n: int = SEMANTIC_TOP_N,
    ) -> list[dict]:
        """
        Fonction CPU-bound synchrone — à appeler via asyncio.to_thread()
        depuis un contexte async pour ne pas bloquer l'event loop.
        """
        if not query_text or not candidates:
            return []

        embed_model = self.get_embed_model()

        query_vector = np.array(embed_model.get_query_embedding(query_text))
        candidate_texts = [c["designation"] for c in candidates]
        candidate_vectors = np.array(embed_model.get_text_embedding_batch(candidate_texts))

        scores = self._cosine_similarity(query_vector, candidate_vectors)
        top_indices = scores.argsort()[::-1][:top_n]

        return [
            {
                "product_id": candidates[idx]["id"],
                "designation": candidates[idx]["designation"],
                "score": float(round(scores[idx], 4)),
            }
            for idx in top_indices
            if scores[idx] > 0
        ]


def match_products(
    supplier_product_name: str,
    tender_products: list[dict],
    top_n: int = SEMANTIC_TOP_N,
) -> list[dict]:
    """
    Fonction utilitaire synchrone (CPU-bound) : matche un produit fournisseur
    avec les produits d'un tender. Appeler via asyncio.to_thread() depuis
    du code async.
    """
    matcher = SemanticMatcher()
    return matcher.find_top_matches(supplier_product_name, tender_products, top_n)
