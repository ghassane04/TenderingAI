from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from core.dependencies import get_db, get_current_user, require_acheteur
from services.pdf_service import service_get_tender_pdfs
from schemas.pdf_schema import GenerateLotsPDFRequest, GenerateLotsPDFResponse, GenerateLotPDFRequest
from services.generate_pdf_service import generate_tender_lots_pdfs, generate_single_lot_pdf
from database.tenders_project_dao import get_tender_by_id
from database.tender_pdfs_dao import get_pdf_by_id

router = APIRouter(prefix="/api/pdf", tags=["Pdf"])


@router.post("/generate-lots-pdf")
async def api_generate_lots_pdf(
    request: GenerateLotsPDFRequest,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Génère les PDFs par lot et enregistre les résultats en BDD.
    """
    # Vérification que le tender existe
    tender = await get_tender_by_id(conn, request.tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tender introuvable",
        )

    generated_by = f"{current_user['first_name']} {current_user['last_name']}"

    try:
        async with conn.transaction():
            result = await generate_tender_lots_pdfs(
                conn,
                tender_id=request.tender_id,
                generated_by=generated_by,
            )

            return {
                "success": True,
                "tender_id": request.tender_id,
                "generated": len(result["pdfs"]),
                "pdfs": result["pdfs"],
                "warnings": result["warnings"],
                "message": f"{len(result['pdfs'])} PDF(s) générés avec succès.",
            }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/generate-lot-pdf")
async def api_generate_single_lot_pdf(
    request: GenerateLotPDFRequest,
    conn=Depends(get_db),
    current_user=Depends(require_acheteur),
):
    """
    Régénère le PDF d'un seul lot technique, sans toucher aux autres.
    """
    # Vérification que le tender existe
    tender = await get_tender_by_id(conn, request.tender_id)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tender introuvable",
        )

    generated_by = f"{current_user['first_name']} {current_user['last_name']}"

    try:
        async with conn.transaction():
            result = await generate_single_lot_pdf(
                conn,
                tender_id=request.tender_id,
                technical_lot_id=request.technical_lot_id,
                generated_by=generated_by,
            )

            return {
                "success": True,
                "pdf": result,
                "message": f"PDF du lot « {result['lot_name']} » régénéré avec succès.",
            }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("/download/{pdf_id}")
async def api_download_pdf(
    pdf_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Télécharge le fichier PDF physique correspondant à cet enregistrement.
    """
    pdf = await get_pdf_by_id(conn, pdf_id)
    if not pdf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF introuvable",
        )

    path = Path(pdf["file_path"])
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier introuvable sur le serveur — régénérez-le.",
        )

    return FileResponse(
        path=str(path),
        filename=pdf["filename"],
        media_type="application/pdf",
    )


@router.get("/{tender_id}")
async def api_get_tender_pdfs(
    tender_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Récupère la liste des PDFs générés pour un tender.
    """
    return await service_get_tender_pdfs(conn, tender_id)