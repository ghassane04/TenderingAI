from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from core.dependencies import get_db, get_current_user, require_acheteur
from schemas.email_schema import (
    TenderEmailsResponse,
    EmailPreview,
    SendSingleEmailRequest,
    SendEmailResponse,
    CheckEmailsRequest,
    CheckEmailsResponse,
    TslEmailLogEntry,
)
from services.send_email_service import build_email_preview, send_single_email
from services.responses_email_service import check_inbound_emails
from services.email_service import (
    service_get_tender_emails,
    service_get_email_history,
    service_delete_email_log,
)
from database.tender_supplier_lots_dao import get_lot_by_id

router = APIRouter(prefix="/api/emails", tags=["Emails"])


@router.get("/{tender_id}", response_model=TenderEmailsResponse)
async def api_get_tender_emails(
    tender_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Récupère tous les emails d'un tender.
    """
    return await service_get_tender_emails(conn, tender_id)


@router.get("/preview/{tsl_id}", response_model=EmailPreview)
async def api_get_email_preview(
    tsl_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Génère un aperçu de l'email à envoyer.
    """
    row = await get_lot_by_id(conn, tsl_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Association fournisseur/lot introuvable",
        )
    return build_email_preview(row)


@router.post("/send/{tsl_id}", response_model=SendEmailResponse)
async def api_send_single_email(
    tsl_id: int,
    request: SendSingleEmailRequest,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Envoie un email à un fournisseur pour un lot technique.
    """
    generated_by = f"{current_user['first_name']} {current_user['last_name']}"

    try:
        async with conn.transaction():
            result = await send_single_email(
                conn,
                tsl_id=tsl_id,
                subject=request.subject,
                body=request.body,
                generated_by=generated_by,
            )
            return SendEmailResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Échec de l'envoi : {str(e)}",
        )


@router.get("/history/{tsl_id}", response_model=List[TslEmailLogEntry])
async def api_get_email_history(
    tsl_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Récupère l'historique des emails pour une association fournisseur/lot.
    """
    return await service_get_email_history(conn, tsl_id)


@router.post("/check-emails", response_model=CheckEmailsResponse)
async def api_check_emails(
    request: CheckEmailsRequest,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Vérifie les emails entrants et traite les réponses.
    """
    try:
        async with conn.transaction():
            count = await check_inbound_emails(conn, request.range)
            return CheckEmailsResponse(
                success=True,
                message=(
                    f"{count} nouvelle(s) réponse(s) traitée(s)."
                    if count
                    else "Aucune nouvelle réponse trouvée."
                ),
                inserted_count=count,
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la vérification des emails : {str(e)}",
        )


@router.delete("/history/log/{log_id}")
async def api_delete_email_log(
    log_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Supprime une entrée de l'historique des emails.
    """
    async with conn.transaction():
        return await service_delete_email_log(conn, log_id)