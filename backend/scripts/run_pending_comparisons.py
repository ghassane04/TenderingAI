"""Calcule séquentiellement les comparaisons fournisseur encore absentes.

Le traitement séquentiel est volontaire : sur une carte graphique portable,
plusieurs longues requêtes Ollama en parallèle peuvent saturer la VRAM ou
dépasser le délai d'attente pendant qu'elles patientent dans la file locale.
"""

import asyncio
import logging

from psycopg.rows import dict_row

from database.connection import close_pool, init_pool
from schemas.comparison_schema import CompareTechnicalRequest
from services.comparison_service import execute_technical_comparison


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def _pending_product_ids(conn) -> list[int]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT sp.id
            FROM suppliers_products sp
            LEFT JOIN supplier_product_comparison_results cr
              ON cr.supplier_product_id = sp.id
            WHERE sp.product_id IS NOT NULL AND cr.supplier_product_id IS NULL
            ORDER BY sp.id
            """
        )
        return [row["id"] for row in await cur.fetchall()]


async def main() -> None:
    pool = await init_pool(min_size=1, max_size=2)
    failures: list[tuple[int, str]] = []
    try:
        async with pool.connection() as conn:
            product_ids = await _pending_product_ids(conn)

        logger.info("%d comparaison(s) à calculer : %s", len(product_ids), product_ids)
        for index, product_id in enumerate(product_ids, start=1):
            try:
                async with pool.connection() as conn:
                    await execute_technical_comparison(
                        conn,
                        CompareTechnicalRequest(supplier_product_id=product_id),
                    )
                logger.info("[%d/%d] produit fournisseur %d terminé", index, len(product_ids), product_id)
            except Exception as exc:  # continue pour laisser un maximum de données exploitables
                logger.exception("[%d/%d] produit fournisseur %d en erreur", index, len(product_ids), product_id)
                failures.append((product_id, str(exc)))
    finally:
        await close_pool()

    if failures:
        raise RuntimeError(f"Comparaisons en erreur : {failures}")


if __name__ == "__main__":
    asyncio.run(main())
