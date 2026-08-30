from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from typing import List
import mimetypes
from pathlib import Path
from fastapi.responses import FileResponse

from core.dependencies import get_db, get_current_user, require_admin, require_acheteur
from schemas.document_schema import DocumentInfo, DocumentDetailResponse
from services.document_service import (
    service_get_tender_documents,
    service_get_document_detail,
    upload_tender_documents,
    service_delete_document,
)
from services.tender_process_service import launch_reprocess_background
from database.document_dao import get_document_by_id

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("/{tender_id}", response_model=List[DocumentInfo])
async def api_get_tender_documents(
    tender_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service_get_tender_documents(conn, tender_id)


@router.get("/{document_id}/detail", response_model=DocumentDetailResponse)
async def api_get_document_detail(
    document_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service_get_document_detail(conn, document_id)


@router.post("/{tender_id}/upload", status_code=status.HTTP_201_CREATED)
async def api_upload_document_to_tender(
    tender_id: int,
    files: List[UploadFile] = File(...),
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    uploaded_by = f"{current_user['first_name']} {current_user['last_name']}"
    try:
        async with conn.transaction():
            return await upload_tender_documents(
                conn=conn, tender_id=tender_id, files=files, uploaded_by=uploaded_by,
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{document_id}/reprocess", status_code=status.HTTP_202_ACCEPTED)
async def api_reprocess_document(
    document_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """Relance l'extraction pour un seul document, en arrière-plan."""
    doc = await get_document_by_id(conn, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable")

    uploaded_by = f"{current_user['first_name']} {current_user['last_name']}"
    launch_reprocess_background(document_id, uploaded_by)

    return {
        "success": True,
        "document_id": document_id,
        "message": "Retraitement démarré en arrière-plan.",
    }

@router.get("/{document_id}/download")
async def api_download_document(
    document_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc = await get_document_by_id(conn, document_id)
    if not doc or not doc.get("path"):
        raise HTTPException(status_code=404, detail="Document introuvable")

    path = Path(doc["path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Fichier introuvable sur le serveur")

    media_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return FileResponse(path=str(path), filename=path.name, media_type=media_type)


@router.delete("/{document_id}")
async def api_delete_document(
    document_id: int,
    conn=Depends(get_db),
    current_user=Depends(require_admin),
):
    async with conn.transaction():
        return await service_delete_document(conn, document_id)