import asyncio
import logging
from fastapi import HTTPException
from typing import List

from database.supplier_product_dao import get_supplier_product_by_id
from database.requirement_dao import get_product_requirements_by_id
from database.characteristics_dao import (
    get_technical_characteristics_by_supplier_product,
    reset_technical_characteristic_evaluations,
    update_technical_characteristic_evaluation,
)
from database.comparison_dao import upsert_comparison_result
from llm.client import compare_requirements_with_characteristics
from schemas.comparison_schema import CompareTechnicalRequest
from schemas.comparison_info_schema import SupplierProductComparisonResult
from services.background import track_task
from services.comparison_info_service import build_supplier_product_comparison

logger = logging.getLogger(__name__)


async def execute_technical_comparison(conn, request: CompareTechnicalRequest) -> None:
    sp = await get_supplier_product_by_id(conn, request.supplier_product_id)
    if not sp:
        raise HTTPException(status_code=404, detail="Produit fournisseur non trouvé")

    product_id = sp.get("product_id")
    if not product_id:
        raise HTTPException(status_code=400, detail="Ce produit fournisseur n'est pas encore confirmé")

    requirements = await get_product_requirements_by_id(conn, product_id)
    if not requirements:
        raise HTTPException(status_code=404, detail="Aucune exigence pour ce produit tender")

    technicals = await get_technical_characteristics_by_supplier_product(conn, request.supplier_product_id)
    if not technicals:
        raise HTTPException(status_code=404, detail="Aucune caractéristique technique trouvée")

    result = await compare_requirements_with_characteristics(requirements=requirements, technicals=technicals)

    valid_requirement_ids = {req["id"] for req in requirements}
    valid_characteristic_ids = {technical["id"] for technical in technicals}
    conforming_requirement_ids: set[int] = set()

    async with conn.transaction():
        await reset_technical_characteristic_evaluations(conn, request.supplier_product_id)

        for ev in result.evaluations:
            if ev.requirement_id not in valid_requirement_ids:
                logger.warning(
                    "Exigence LLM invalide ignorée pour supplier_product_id=%s : %s",
                    request.supplier_product_id,
                    ev.requirement_id,
                )
                continue

            matched_ids = {
                char_id
                for char_id in ev.matched_characteristic_ids
                if char_id in valid_characteristic_ids
            }
            if ev.matched_characteristic_ids and len(matched_ids) != len(set(ev.matched_characteristic_ids)):
                logger.warning(
                    "Caractéristique(s) LLM invalide(s) ignorée(s) pour supplier_product_id=%s",
                    request.supplier_product_id,
                )

            # Une exigence ne peut pas être conforme/non conforme sans aucune
            # caractéristique fournisseur qui la justifie.
            evaluation = ev.evaluation if matched_ids else 3
            if evaluation == 1:
                conforming_requirement_ids.add(ev.requirement_id)

            for char_id in matched_ids:
                await update_technical_characteristic_evaluation(
                    conn=conn, characteristic_id=char_id,
                    evaluation=evaluation, requirement_id=ev.requirement_id,
                )
        for char_id in set(result.caracteristiques_hors_exigences) & valid_characteristic_ids:
            await update_technical_characteristic_evaluation(
                conn=conn, characteristic_id=char_id, evaluation=3, requirement_id=None,
            )

        total_reqs = len(valid_requirement_ids)
        score = (
            len(conforming_requirement_ids) / total_reqs * 100
            if total_reqs
            else 0.0
        )
        await upsert_comparison_result(
            conn=conn, supplier_product_id=request.supplier_product_id,
            product_id=product_id, score=score, computed_by="API",
        )

async def _run_comparison_isolated(supplier_product_id: int) -> None:
    from database.connection import get_pool
    pool = await get_pool()
    async with pool.connection() as conn:
        await execute_technical_comparison(conn, CompareTechnicalRequest(supplier_product_id=supplier_product_id))


def launch_comparison_background(supplier_product_id: int) -> None:
    task = asyncio.create_task(_run_comparison_isolated(supplier_product_id))
    track_task(task, f"Comparaison supplier_product {supplier_product_id}")

async def service_correct_comparison(
    conn, supplier_product_id: int, corrections: list[dict],
) -> SupplierProductComparisonResult:

    sp = await get_supplier_product_by_id(conn, supplier_product_id)
    if not sp or not sp.get("product_id"):
        raise HTTPException(status_code=404, detail="Produit fournisseur introuvable ou non confirmé")

    try:
        async with conn.transaction():
            for corr in corrections:
                for char_id in corr["characteristic_ids"]:
                    await update_technical_characteristic_evaluation(
                        conn=conn, characteristic_id=char_id,
                        evaluation=corr["evaluation"], requirement_id=corr.get("requirement_id"),
                    )

            updated = await build_supplier_product_comparison(conn, supplier_product_id)

            await upsert_comparison_result(
                conn=conn, supplier_product_id=supplier_product_id,
                product_id=sp["product_id"], score=updated.score, computed_by="MANUAL_CORRECTION",
            )
        return updated
    except HTTPException:
        raise
    except Exception:
        logger.exception("Erreur correction comparaison pour supplier_product_id=%s", supplier_product_id)
        raise HTTPException(status_code=500, detail="Erreur lors de la correction de la comparaison")
