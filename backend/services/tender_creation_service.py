import asyncio
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from typing import List, Tuple
from fastapi import UploadFile, HTTPException, status

from utils.document_reader import load_document
from llm.client import extract_tender_info
from database.tenders_project_dao import get_tender_by_code, insert_tender
from schemas.tender_metadata_schema import TenderManualCreate, CreateTenderResponse, TenderMetadata
from core.config import AO_DATA_DIR
from database.document_dao import (
    insert_document,
    DOCUMENT_STATUS_WAITING,
) 
from utils.safe_filename import sanitize_filename

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


async def create_document(conn, file_path: Path, tender_id: int, uploaded_by: str) -> int:
    """Insère un nouveau document lié à un tender en base de données."""
    validate_file(file_path)
    file_name = file_path.name
    filetype_id = resolve_filetype_id(file_path)
    file_size = format_file_size(get_file_size_bytes(file_path))
    now = datetime.now()

    doc_id = await insert_document(
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
    return doc_id

async def create_tender_from_files(
    conn,
    files: List[UploadFile],
    uploaded_by: str = "API"
) -> CreateTenderResponse:
    if not files:
        raise HTTPException(status_code=400, detail="Aucun fichier fourni.")

    temp_dir = Path(tempfile.gettempdir()) / "tender_bulk_initializations"
    temp_dir.mkdir(parents=True, exist_ok=True)

    saved_temp_files: List[Tuple[Path, str]] = []
    extracted_metadata: TenderMetadata | None = None

    try:
        for file in files:
            file_name = sanitize_filename(file.filename or "")
            ext = Path(file_name).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                continue

            temp_path = temp_dir / f"{datetime.now().timestamp()}_{file_name}"
            with open(temp_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)

            try:
                validate_file(temp_path)
                saved_temp_files.append((temp_path, file_name))
            except Exception as e:
                if temp_path.exists():
                    temp_path.unlink()
                print(f"[Validation] Fichier ignoré ({file.filename}): {e}")

        if not saved_temp_files:
            raise HTTPException(
                status_code=400,
                detail=f"Aucun fichier valide. Formats acceptés : {', '.join(ALLOWED_EXTENSIONS)}",
            )

        for temp_path, safe_name in saved_temp_files:
            try:
                text = (await load_document(str(temp_path), max_pages=3))[:2000]
                if not text.strip():
                    continue
                metadata = await extract_tender_info(text)
                if metadata and metadata.code and metadata.designation:
                    extracted_metadata = metadata
                    break
            except Exception as e:
                print(f"[Creation] Échec extraction sur {safe_name} : {e}")
                continue

        if not extracted_metadata:
            raise HTTPException(
                status_code=422,
                detail="Impossible d'extraire le Code et la Désignation depuis les fichiers fournis.",
            )

        existing = await get_tender_by_code(conn, extracted_metadata.code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Un appel d'offres avec le code '{extracted_metadata.code}' existe déjà.",
            )

        tender_id = await insert_tender(
            conn,
            extracted_metadata.code,
            extracted_metadata.designation,
            extracted_metadata.client,
            uploaded_by,
        )

        final_dir = Path(AO_DATA_DIR) / str(tender_id)
        final_dir.mkdir(parents=True, exist_ok=True)

        for temp_path, safe_name in saved_temp_files:
            final_file_path = final_dir / safe_name
            shutil.move(str(temp_path), str(final_file_path))

            await create_document(
                conn=conn,
                file_path=final_file_path,
                tender_id=tender_id,
                uploaded_by=uploaded_by,
            )

        return CreateTenderResponse(
            success=True,
            tender_id=tender_id,
            code=extracted_metadata.code,
            designation=extracted_metadata.designation,
            nom_client=extracted_metadata.client,
            message=f"Tender créé avec succès (ID: {tender_id}).",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur création tender : {str(e)}")
    finally:
        for temp_path, _ in saved_temp_files:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass

async def service_create_tender_manually(
    conn,
    tender_data: TenderManualCreate,
    created_by: str = "API"
) -> dict:
    """
    Crée un appel d'offres manuellement à partir des informations saisies par l'utilisateur.
    """
    # 1. Validation basique des champs
    code = tender_data.tender_code.strip()
    designation = tender_data.designation.strip()
    client = (tender_data.nom_client or "").strip()

    if not code or not designation :
        raise HTTPException(
            status_code=400,
            detail="Le code, la désignation sont obligatoires."
        )

    # 2. Vérification si le tender_code existe déjà
    existing = await get_tender_by_code(conn, code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un appel d'offres avec le code '{code}' existe déjà."
        )

    # 3. Insertion dans la base de données
    try:
        tender_id = await insert_tender(
            conn,
            code,
            designation,
            client,
            created_by,
        )

        return {
            "success": True,
            "tender_id": tender_id,
            "code": code,
            "designation": designation,
            "nom_client": client,
            "message": "Appel d'offres créé avec succès. Vous pouvez maintenant y ajouter des documents."
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la création de l'appel d'offres : {str(e)}"
        )
