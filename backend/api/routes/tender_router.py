from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from typing import List

from core.dependencies import get_db, get_current_user, require_admin, require_acheteur
from schemas.tender_metadata_schema import TenderManualCreate, CreateTenderResponse
from schemas.tender_info_schema import (
    TenderListResponse,
    TenderMetadata,
    TenderMetadataCorrection,
)
from services.tender_creation_service import (
    create_tender_from_files,
    service_create_tender_manually,
)
from services.tender_process_service import launch_tender_pipeline_background
from services.tender_info_service import (
    service_list_tenders,
    service_get_tender_metadata,
    service_delete_tender,
    service_update_tender_metadata,
)
from database.tenders_project_dao import get_tender_by_id

router = APIRouter(prefix="/api/tenders", tags=["Tenders"])


@router.post("/initialize", response_model=CreateTenderResponse, status_code=status.HTTP_201_CREATED)
async def api_initialize_tender(
    files: List[UploadFile] = File(...),
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Crée un tender à partir de fichiers uploadés.
    - Extrait automatiquement les métadonnées
    - Déplace les fichiers dans le répertoire final
    """
    uploaded_by = f"{current_user['first_name']} {current_user['last_name']}"

    async with conn.transaction():
        return await create_tender_from_files(
            conn=conn,
            files=files,
            uploaded_by=uploaded_by,
        )


@router.post("/manual", status_code=status.HTTP_201_CREATED)
async def create_tender_manual_endpoint(
    tender_data: TenderManualCreate,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Crée un tender manuellement (saisie utilisateur).
    """
    uploaded_by = f"{current_user['first_name']} {current_user['last_name']}"

    async with conn.transaction():
        return await service_create_tender_manually(
            conn=conn,
            tender_data=tender_data,
            created_by=uploaded_by,
        )


@router.post("/{tender_id}/process", status_code=status.HTTP_202_ACCEPTED)
async def api_process_tender(
    tender_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    tender = await get_tender_by_id(conn, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender introuvable")

    uploaded_by = f"{current_user['first_name']} {current_user['last_name']}"
    launch_tender_pipeline_background(tender_id, uploaded_by)

    return {
        "success": True,
        "tender_id": tender_id,
        "message": "Extraction démarrée en arrière-plan.",
    }

@router.get("", response_model=TenderListResponse)
async def api_list_tenders(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Liste tous les appels d'offres.
    """
    return await service_list_tenders(conn)


@router.get("/{tender_id}/metadata", response_model=TenderMetadata)
async def api_get_tender_metadata(
    tender_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Récupère les métadonnées d'un tender.
    """
    return await service_get_tender_metadata(conn, tender_id)


@router.patch("/{tender_id}/metadata")
async def api_update_tender_metadata(
    tender_id: int,
    request: TenderMetadataCorrection,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Met à jour les métadonnées d'un tender (code, designation, client).
    """
    request.updated_by = f"{current_user['first_name']} {current_user['last_name']}"

    async with conn.transaction():
        return await service_update_tender_metadata(conn, tender_id, request)


@router.delete("/{tender_id}")
async def api_delete_tender(
    tender_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_admin),
):
    """
    Supprime un tender et toutes ses données associées.
    - Réservé aux administrateurs
    """
    async with conn.transaction():
        return await service_delete_tender(conn, tender_id)