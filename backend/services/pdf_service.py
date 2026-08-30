from pathlib import Path
from fastapi import HTTPException, status
import shutil

from database.tender_pdfs_dao import get_pdfs_by_tender
from schemas.pdf_schema import PdfInfo


async def service_get_tender_pdfs(conn, tender_id: int) -> list[PdfInfo]:
    """
    Récupère les PDFs depuis la BDD (plus fiable que de scanner le filesystem).
    Vérifie quand même l'existence physique du fichier.
    """
    rows = await get_pdfs_by_tender(conn, tender_id)

    result = []
    for r in rows:
        file_path = r.get("file_path", "")
        exists = bool(file_path and Path(file_path).exists())
        result.append(
            PdfInfo(
                id=r["id"],
                lot_id=r["technical_lot_id"],
                lot_name=r["lot_name"],
                filename=r["filename"],
                file_path=file_path,
                file_size=r.get("file_size"),
                generated_at=r.get("generated_at"),
                generated_by=r.get("generated_by"),
                exists=exists,
            )
        )
    return result