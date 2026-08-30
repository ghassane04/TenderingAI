from fastapi import HTTPException, status
from typing import List

from database.tenders_project_dao import get_tender_by_id
from database.tender_supplier_lots_dao import (
    get_lots_by_tender,
    get_lot_by_id,
    insert_tender_supplier_lot,
    delete_tender_supplier_lot,
)
from database.tender_pdfs_dao import get_pdfs_by_tender
from schemas.tsl_schema import CreateTslResponse, TslSummary


def _build_tsl_summary(row: dict, existing_pdf_lot_ids: set) -> TslSummary:
    """Construit un objet TslSummary à partir d'une ligne de base de données."""
    return TslSummary(
        tsl_id=row["tsl_id"],
        tender_id=row.get("tender_id"),
        supplier_id=row.get("supplier_id"),
        supplier_name=row["supplier_name"],
        supplier_email=row.get("supplier_email"),
        technical_lot_id=row.get("technical_lot_id"),
        lot_name=row["lot_name"],
        status_id=row.get("status_id"),
        status_name=row.get("status_name"),
        email_sent_at=row.get("last_sent_at"),
        email_received_at=row.get("last_received_at"),
        created_at=row.get("created_at"),
        pdf_exists=row.get("technical_lot_id") in existing_pdf_lot_ids,
    )


async def service_get_tsl(conn, tender_id: int) -> List[TslSummary]:
    """Récupère toutes les associations fournisseur/lot pour un tender."""
    tender = await get_tender_by_id(conn, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender introuvable")

    rows = await get_lots_by_tender(conn, tender_id)
    pdfs = await get_pdfs_by_tender(conn, tender_id)
    existing_pdf_lot_ids = {
        p["technical_lot_id"] for p in pdfs if p.get("technical_lot_id")
    }

    return [_build_tsl_summary(r, existing_pdf_lot_ids) for r in rows]


async def service_create_tsl(
    conn,
    tender_id: int,
    supplier_id: int,
    technical_lot_id: int,
) -> CreateTslResponse:
    """Crée une nouvelle association fournisseur/lot."""
    tender = await get_tender_by_id(conn, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender introuvable")

    try:
        tsl_id = await insert_tender_supplier_lot(
            conn,
            tender_id=tender_id,
            supplier_id=supplier_id,
            technical_lot_id=technical_lot_id,
        )

        row = await get_lot_by_id(conn, tsl_id)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Association créée mais introuvable",
            )

        return CreateTslResponse(
            id=tsl_id,
            supplier_name=row["supplier_name"],
            lot_name=row["lot_name"],
            status_name=row.get("status_name"),
        )

    except Exception as e:
        # PostgreSQL violation de contrainte unique
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Association fournisseur/lot déjà existante",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


async def service_get_tsl_detail(conn, tsl_id: int) -> TslSummary:
    """Récupère les détails d'une association fournisseur/lot."""
    row = await get_lot_by_id(conn, tsl_id)
    if not row:
        raise HTTPException(status_code=404, detail="Association introuvable")

    pdfs = await get_pdfs_by_tender(conn, row["tender_id"])
    existing_pdf_lot_ids = {
        p["technical_lot_id"] for p in pdfs if p.get("technical_lot_id")
    }

    return _build_tsl_summary(row, existing_pdf_lot_ids)


async def service_delete_tsl(conn, tsl_id: int) -> dict:
    """Supprime une association fournisseur/lot."""
    existing = await get_lot_by_id(conn, tsl_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Association introuvable")

    # tender_supplier_lot_emails.tsl_id passe à NULL (ON DELETE SET NULL)
    # L'historique des emails et les réponses déjà reçues sont préservés.
    await delete_tender_supplier_lot(conn, tsl_id)

    return {
        "success": True,
        "message": "Association supprimée. L'historique des emails et les réponses déjà reçues sont conservés.",
    }