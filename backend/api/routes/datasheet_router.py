from fastapi import APIRouter, Depends, HTTPException, status
import mimetypes
from pathlib import Path
from fastapi.responses import FileResponse

from core.dependencies import get_db, get_current_user, require_acheteur
from schemas.datasheet_process_schema import ProcessStoredDatasheetResponse
from schemas.datasheet_info_schema import ListDatasheet, DatasheetDetail
from schemas.semantic_match_schema import SemanticMatchRequest, SemanticMatchResponse, SupplierProductInfo
from schemas.confirm_schema import ConfirmProductRequest, ConfirmProductResponse

from services.semantic_match_service import (
    compute_match_candidates_for_datasheet,
    get_stored_match_candidates,
)
from services.confirm_service import confirm
from services.datasheet_process_service import launch_extraction_background
from services.datasheet_info_service import (
    service_get_datasheets_by_tender,
    service_get_datasheet_detail,
)
from database.datasheets_dao import get_datasheet_by_id

router = APIRouter(prefix="/api/datasheets", tags=["Datasheets"])

@router.post("/{datasheet_id}/extract", status_code=status.HTTP_202_ACCEPTED)
async def api_extract_datasheet(
    datasheet_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    ds = await get_datasheet_by_id(conn, datasheet_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Fiche technique introuvable")

    launch_extraction_background(datasheet_id)

    return {
        "success": True,
        "datasheet_id": datasheet_id,
        "message": "Extraction démarrée en arrière-plan.",
    }



@router.get("/{tender_id}", response_model=ListDatasheet)
async def api_list_datasheets(
    tender_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service_get_datasheets_by_tender(conn, tender_id)


@router.get("/{datasheet_id}/detail", response_model=DatasheetDetail)
async def api_get_datasheet_detail(
    datasheet_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service_get_datasheet_detail(conn, datasheet_id)

@router.get("/{datasheet_id}/download")
async def api_download_datasheet(
    datasheet_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Sert le fichier brut de la fiche fournisseur."""
    ds = await get_datasheet_by_id(conn, datasheet_id)
    if not ds or not ds.get("file_path"):
        raise HTTPException(status_code=404, detail="Fiche technique introuvable")

    path = Path(ds["file_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable sur le serveur")

    media_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return FileResponse(path=str(path), filename=path.name, media_type=media_type)

@router.post("/{datasheet_id}/semantic-match", response_model=SemanticMatchResponse)
async def api_semantic_match(
    datasheet_id: int,
    request: SemanticMatchRequest,
    force_recompute: bool = False,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    produits = await compute_match_candidates_for_datasheet(
        conn=conn,
        datasheet_id=datasheet_id,
        tender_id=request.tender_id,
        lot_id=request.lot_id,
        top_n=request.top_n,
        force_recompute=force_recompute,
    )

    return SemanticMatchResponse(
        success=True,
        datasheet_id=datasheet_id,
        produits=produits,
        message="Matching sémantique terminé.",
    )

@router.get(
    "/supplier-products/{supplier_product_id}/candidates",
    response_model=SupplierProductInfo,
)
async def api_get_match_candidates(
    supplier_product_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Lecture pure des candidats déjà calculés pour UN produit fournisseur —
    utilisé par l'écran de confirmation produit par produit, sans recalcul.
    """
    return await get_stored_match_candidates(conn, supplier_product_id)

@router.post("/confirm", response_model=ConfirmProductResponse)
async def api_confirm(
    request: ConfirmProductRequest,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    try:
        return await confirm(conn, request)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
