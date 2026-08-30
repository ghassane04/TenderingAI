from fastapi import HTTPException, status

from services.tsl_service import service_get_tsl
from schemas.email_schema import TenderEmailsResponse
from database.tender_supplier_lot_emails_dao import (
    get_email_logs_by_tsl,
    get_email_log_by_id,
    delete_email_log,
)


async def service_get_tender_emails(conn, tender_id: int) -> TenderEmailsResponse:
    """
    Récupère tous les emails d'un tender (via les associations TSL).
    """
    items = await service_get_tsl(conn, tender_id)
    return TenderEmailsResponse(
        tender_id=tender_id,
        total=len(items),
        items=items,
    )


async def service_get_email_history(conn, tsl_id: int) -> list[dict]:
    """
    Récupère l'historique des emails pour une association fournisseur/lot.
    """
    return await get_email_logs_by_tsl(conn, tsl_id)


async def service_delete_email_log(conn, log_id: int) -> dict:
    """
    Supprime une entrée de l'historique des emails.
    """
    existing = await get_email_log_by_id(conn, log_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrée d'historique introuvable",
        )

    deleted = await delete_email_log(conn, log_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrée d'historique introuvable",
        )

    return {"success": True, "message": "Entrée supprimée"}