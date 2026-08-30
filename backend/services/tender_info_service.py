from pathlib import Path
from fastapi import HTTPException, status
import shutil

from core.config import G_PDF_DATA_DIR, AO_DATA_DIR
from database.tenders_project_dao import (
    list_tenders,
    get_tender_by_id,
    delete_tender,
    update_tender_metadata,
)
from schemas.tender_info_schema import (
    TenderListResponse,
    TenderMetadata,
    TenderMetadataCorrection,
)


async def service_list_tenders(conn) -> TenderListResponse:
    """Liste tous les appels d'offres."""
    rows = await list_tenders(conn)
    return TenderListResponse(
        total=len(rows),
        tenders=[TenderMetadata(**r) for r in rows]
    )


async def service_get_tender_metadata(conn, tender_id: int) -> TenderMetadata:
    """Récupère les métadonnées d'un tender."""
    tender = await get_tender_by_id(conn, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender introuvable")
    return TenderMetadata(
        id=tender["id"],
        code=tender["code"],
        designation=tender["designation"],
        nom_client=tender.get("nom_client"),
        status_name=tender.get("status_name"),
        uploaded_at=tender.get("uploaded_at"),
        uploaded_by=tender.get("uploaded_by"),
    )


async def service_update_tender_metadata(
    conn,
    tender_id: int,
    request: TenderMetadataCorrection,
) -> dict:
    """Met à jour les métadonnées d'un tender."""
    try:
        await update_tender_metadata(
            conn,
            tender_id=tender_id,
            code=request.code,
            designation=request.designation,
            nom_client=request.nom_client,
            updated_by=request.updated_by or "UI_React",
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur métadonnées : {str(e)}"
        )


async def service_delete_tender(conn, tender_id: int) -> dict:
    """Supprime un tender et tous ses fichiers associés."""
    tender = await get_tender_by_id(conn, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender introuvable")

    await delete_tender(conn, tender_id)

    # Suppression physique des dossiers
    for base_dir in [AO_DATA_DIR, G_PDF_DATA_DIR]:
        folder = Path(base_dir).expanduser().resolve() / str(tender_id)
        if folder.exists():
            shutil.rmtree(folder, ignore_errors=True)

    return {
        "success": True,
        "message": f"Tender '{tender['code']}' et toutes ses données supprimés"
    }