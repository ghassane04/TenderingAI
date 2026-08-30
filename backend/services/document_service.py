import os
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from typing import List, Tuple
from fastapi import UploadFile, HTTPException, status

from database.document_dao import (
    get_documents_by_tender,
    get_document_by_id,
    get_document_by_tender_and_name,
    delete_document_by_id,
    insert_document,
    restore_document_file,
    DOCUMENT_STATUS_WAITING,
)
from schemas.document_schema import DocumentDetailResponse, DocumentInfo
from utils.safe_filename import sanitize_filename
from core.config import AO_DATA_DIR

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".xlsx", ".xls"}
EXTENSION_TO_FILETYPE_ID = {
    ".pdf": 1, ".docx": 2, ".doc": 2,
    ".xlsx": 3, ".xls": 3, ".txt": 4,
}


class UnsupportedFileTypeError(Exception):
    def __init__(self, extension: str):
        super().__init__(f"Extension non supportée : '{extension}'.")
        self.extension = extension


def resolve_filetype_id(file_path: Path) -> int:
    ext = file_path.suffix.lower()
    if not ext:
        raise ValueError(f"Fichier sans extension : {file_path.name}")
    fid = EXTENSION_TO_FILETYPE_ID.get(ext)
    if fid is None:
        raise UnsupportedFileTypeError(ext)
    return fid


def get_file_size_bytes(file_path: Path) -> int:
    try:
        return file_path.stat().st_size
    except OSError as e:
        raise ValueError(f"Impossible de lire {file_path.name} : {e}")


def format_file_size(size_bytes: int) -> str:
    if size_bytes < 0:
        raise ValueError("Taille négative")
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} PB"


def validate_file(file_path: Path) -> None:
    if not file_path.exists():
        raise FileNotFoundError(f"Fichier introuvable : {file_path}")
    if not file_path.is_file():
        raise ValueError(f"N'est pas un fichier : {file_path}")
    resolve_filetype_id(file_path)
    if get_file_size_bytes(file_path) == 0:
        raise ValueError(f"Fichier vide : {file_path.name}")


async def create_document(
    conn,
    file_path: Path,
    tender_id: int,
    uploaded_by: str,
) -> int:
    """
    Insère un nouveau document en base de données avec statut WAITING.
    """
    validate_file(file_path)
    file_name = file_path.name
    filetype_id = resolve_filetype_id(file_path)
    file_size = format_file_size(get_file_size_bytes(file_path))
    now = datetime.now()

    return await insert_document(
        conn=conn,
        designation=file_name,
        count_chunks=0,
        nb_chunks_done=0,
        path=str(file_path),
        uploaded_at=now,
        uploaded_by=uploaded_by,
        updated_at=now,
        updated_by=uploaded_by,
        tender_id=tender_id,
        filetype_id=filetype_id,
        statut_id=DOCUMENT_STATUS_WAITING,
        file_size=file_size,
    )


async def service_get_tender_documents(conn, tender_id: int) -> List[DocumentInfo]:
    """
    Récupère la liste des documents d'un tender.
    """
    rows = await get_documents_by_tender(conn, tender_id)
    return [
        DocumentInfo(
            id=r["id"],
            designation=r.get("designation"),
            statut_name=r.get("statut_name"),
            statut_id=r.get("statut_id"),
            count_chunks=r.get("count_chunks", 0),
            nb_chunks_done=r.get("nb_chunks_done", 0),
            uploaded_at=r.get("uploaded_at"),
            uploaded_by=r.get("uploaded_by"),
        )
        for r in rows
    ]


async def service_get_document_detail(conn, document_id: int) -> DocumentDetailResponse:
    """
    Récupère les détails d'un document.
    """
    doc = await get_document_by_id(conn, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document introuvable",
        )

    return DocumentDetailResponse(
        id=doc["id"],
        tender_id=doc.get("tender_id"),
        designation=doc.get("designation"),
        file_size=doc.get("file_size"),
        filetype=doc.get("filetype"),
        statut_name=doc.get("statut_name"),
        statut_id=doc.get("statut_id"),
        count_chunks=doc.get("count_chunks", 0),
        nb_chunks_done=doc.get("nb_chunks_done", 0),
        uploaded_at=doc.get("uploaded_at"),
        uploaded_by=doc.get("uploaded_by"),
        updated_at=doc.get("updated_at"),
        updated_by=doc.get("updated_by"),
    )


async def service_delete_document(conn, document_id: int) -> dict:
    """
    Supprime un document et son fichier physique.
    """
    doc = await get_document_by_id(conn, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document introuvable",
        )

    # Supprimer le fichier physiquement s'il existe
    if doc.get("path") and os.path.exists(doc["path"]):
        try:
            os.remove(doc["path"])
        except Exception as e:
            print(f"Erreur lors de la suppression du fichier physiquement: {e}")

    deleted = await delete_document_by_id(conn, document_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document introuvable",
        )

    return {
        "message": "Document et données associées supprimés avec succès"
    }

async def upload_tender_documents(
    conn,
    tender_id: int,
    files: List[UploadFile],
    uploaded_by: str = "API",
) -> dict:
    """
    Upload de plusieurs documents pour un tender.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun fichier fourni.",
        )

    temp_dir = Path(tempfile.gettempdir()) / "tender_bulk_initializations"
    temp_dir.mkdir(parents=True, exist_ok=True)

    saved_temp_files: List[Tuple[Path, str, int | None]] = []
    created_docs_ids: List[int] = []
    skipped_files: List[dict] = []

    try:
        final_dir = Path(AO_DATA_DIR) / str(tender_id)
        final_dir.mkdir(parents=True, exist_ok=True)

        for file in files:
            original_display_name = file.filename or ""
            file_name = sanitize_filename(original_display_name)
            ext = Path(file_name).suffix.lower()

            if ext not in ALLOWED_EXTENSIONS:
                skipped_files.append({
                    "file": original_display_name,
                    "reason": f"Extension '{ext}' non autorisée"
                })
                continue

            existing = await get_document_by_tender_and_name(
                conn=conn,
                tender_id=tender_id,
                file_name=file_name,
            )
            existing_path = Path(existing["path"]) if existing and existing.get("path") else None
            canonical_path = (final_dir / file_name).resolve()
            existing_is_canonical = bool(
                existing_path
                and existing_path.is_file()
                and existing_path.resolve() == canonical_path
            )
            if existing and existing_is_canonical:
                skipped_files.append({
                    "file": original_display_name,
                    "reason": "Existe déjà en BDD pour ce Tender"
                })
                continue

            # Une migration de poste peut laisser une ligne valide en base avec
            # un ancien chemin absolu. Dans ce cas, le nouvel upload restaure la
            # ligne existante au lieu de la refuser comme doublon.
            restore_document_id = existing["id"] if existing else None

            temp_path = temp_dir / f"{datetime.now().timestamp()}_{file_name}"
            with open(temp_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)

            try:
                validate_file(temp_path)
                saved_temp_files.append((temp_path, file_name, restore_document_id))
            except Exception as e:
                if temp_path.exists():
                    temp_path.unlink()
                skipped_files.append({
                    "file": original_display_name,
                    "reason": str(e)
                })

        if not saved_temp_files:
            return {
                "success": False,
                "tender_id": tender_id,
                "uploaded_count": 0,
                "skipped_count": len(skipped_files),
                "skipped_files": skipped_files,
                "message": "Aucun nouveau fichier valide n'a été ajouté."
            }

        for temp_path, safe_name, restore_document_id in saved_temp_files:
            final_file_path = final_dir / safe_name
            shutil.move(str(temp_path), str(final_file_path))

            if restore_document_id is not None:
                await restore_document_file(
                    conn=conn,
                    document_id=restore_document_id,
                    path=str(final_file_path),
                    file_size=format_file_size(get_file_size_bytes(final_file_path)),
                    filetype_id=resolve_filetype_id(final_file_path),
                    updated_at=datetime.now(),
                    updated_by=uploaded_by,
                )
                doc_id = restore_document_id
            else:
                doc_id = await create_document(
                    conn=conn,
                    file_path=final_file_path,
                    tender_id=tender_id,
                    uploaded_by=uploaded_by,
                )
            created_docs_ids.append(doc_id)

        return {
            "success": True,
            "tender_id": tender_id,
            "uploaded_count": len(created_docs_ids),
            "skipped_files": skipped_files,
            "message": (
                f"{len(created_docs_ids)} document(s) ajouté(s) avec succès. "
                "Relancez le pipeline de traitement pour extraire les données."
            )
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'upload des documents : {str(e)}"
        )
    finally:
        for temp_path, _, _ in saved_temp_files:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass
