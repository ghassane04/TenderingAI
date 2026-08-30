import asyncio
import logging

from fastapi import HTTPException
from typing import List

from database.supplier_product_dao import get_supplier_products_by_datasheet
from database.tender_product_dao import get_tender_products_by_id_and_lot
from database.match_candidates_dao import (
    insert_match_candidates,
    get_candidates_by_supplier_product,
    has_candidates,
)
from utils.semantic_matcher import match_products
from schemas.semantic_match_schema import SupplierProductInfo, ProductCandidate
from services.background import track_task 

logger = logging.getLogger(__name__)


async def _compute_and_store_candidates(
    conn, supplier_product_id: int, supplier_product_name: str,
    tender_products: list[dict], top_n: int,
) -> list[dict]:
    """Calcule les candidats (CPU-bound, via to_thread) et les persiste."""
    candidats = await asyncio.to_thread(
        match_products, supplier_product_name, tender_products, top_n,
    )
    await insert_match_candidates(conn, supplier_product_id, candidats)
    return candidats


async def compute_match_candidates_for_datasheet(
    conn, datasheet_id: int, tender_id: int, lot_id: int,
    top_n: int = 5, force_recompute: bool = False,
) -> List[SupplierProductInfo]:
    """
    Calcule et persiste les candidats de matching pour tous les produits
    d'un datasheet. Par défaut, ne recalcule PAS les produits qui ont déjà
    des candidats stockés (évite de repayer le calcul pour des produits déjà
    traités) — passer force_recompute=True pour tout réévaluer.
    """
    tender_products = await get_tender_products_by_id_and_lot(conn, tender_id, lot_id)
    if not tender_products:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun produit configuré pour le Tender {tender_id} / Lot {lot_id}",
        )

    supplier_products = await get_supplier_products_by_datasheet(conn, datasheet_id)
    if not supplier_products:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun produit extrait pour la fiche {datasheet_id}. "
                   "Lancez d'abord l'extraction via POST /datasheets/{id}/extract",
        )

    results: List[SupplierProductInfo] = []

    for sp in supplier_products:
        if not force_recompute and await has_candidates(conn, sp["id"]):
            candidats = await get_candidates_by_supplier_product(conn, sp["id"])
        else:
            candidats = await _compute_and_store_candidates(
                conn, sp["id"], sp["designation"], tender_products, top_n,
            )

        results.append(SupplierProductInfo(
            supplier_product_id=sp["id"],
            nom_produit=sp["designation"],
            candidats=[
                ProductCandidate(product_id=c["product_id"], designation=c["designation"], score=c["score"])
                for c in candidats
            ],
        ))

    return results


async def compute_match_candidates_for_supplier_product(
    conn, supplier_product_id: int, supplier_product_name: str,
    tender_id: int, lot_id: int, top_n: int = 5,
) -> SupplierProductInfo:
    """
    Recalcule les candidats pour UN SEUL produit fournisseur — utilisé par le
    bouton "recalculer" côté UI, sans toucher aux autres produits du datasheet.
    """
    tender_products = await get_tender_products_by_id_and_lot(conn, tender_id, lot_id)
    if not tender_products:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun produit configuré pour le Tender {tender_id} / Lot {lot_id}",
        )

    candidats = await _compute_and_store_candidates(
        conn, supplier_product_id, supplier_product_name, tender_products, top_n,
    )

    return SupplierProductInfo(
        supplier_product_id=supplier_product_id,
        nom_produit=supplier_product_name,
        candidats=[
            ProductCandidate(product_id=c["product_id"], designation=c["designation"], score=c["score"])
            for c in candidats
        ],
    )


async def get_stored_match_candidates(conn, supplier_product_id: int) -> SupplierProductInfo:
    """Lecture pure des candidats déjà calculés — pour l'écran de confirmation produit par produit."""
    rows = await get_candidates_by_supplier_product(conn, supplier_product_id)
    nom_produit = rows[0]["supplier_product_designation"] if rows else ""
    return SupplierProductInfo(
        supplier_product_id=supplier_product_id,
        nom_produit=nom_produit,
        candidats=[
            ProductCandidate(product_id=r["product_id"], designation=r["designation"], score=r["score"])
            for r in rows
        ],
    )

async def _run_semantic_match_isolated(
    datasheet_id: int, tender_id: int, lot_id: int, top_n: int, force_recompute: bool,
) -> None:
    from database.connection import get_pool
    pool = await get_pool()
    async with pool.connection() as conn:
        await compute_match_candidates_for_datasheet(
            conn=conn, datasheet_id=datasheet_id, tender_id=tender_id,
            lot_id=lot_id, top_n=top_n, force_recompute=force_recompute,
        )

def launch_semantic_match_background(
    datasheet_id: int, tender_id: int, lot_id: int, top_n: int = 5, force_recompute: bool = False,
) -> None:
    task = asyncio.create_task(
        _run_semantic_match_isolated(datasheet_id, tender_id, lot_id, top_n, force_recompute)
    )
    track_task(task, f"Semantic match datasheet {datasheet_id}")