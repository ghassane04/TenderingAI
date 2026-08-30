import asyncio
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Tuple, List
import logging

_background_tasks: set[asyncio.Task] = set()

from core.config import AO_DATA_DIR
from database.connection import get_pool
from database.tenders_project_dao import update_tender_status
from database.technical_lots_dao import get_all_technical_lots
from database.tender_product_dao import delete_products_by_document, insert_product
from database.requirement_dao import insert_requirement
from database.document_dao import (
    get_document_by_tender_and_name,
    get_document_by_id,
    get_documents_by_tender,
    insert_document,
    initialize_document_processing,
    mark_document_chunk_processed,
    finalize_document_processing,
    mark_document_processing_error,
    DOCUMENT_STATUS_WAITING,
    DOCUMENT_STATUS_DONE,
    DOCUMENT_STATUS_PROCESSING,
    DOCUMENT_STATUS_ERROR,
)
from utils.splitter import split_document
from utils.document_reader import load_document
from llm.client import extract_tender_products
from services.background import track_task

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".txt"}
EXTENSION_TO_FILETYPE_ID = {
    ".pdf": 1, ".docx": 2, ".doc": 2,
    ".xlsx": 3, ".xls": 3, ".txt": 4,
}

TENDER_STATUS_EXTRACTION_IN_PROGRESS = 2
TENDER_STATUS_EXTRACTION_DONE = 3
TENDER_STATUS_ERROR = 4


@dataclass
class PipelineStats:
    processed: int = 0
    skipped: int = 0
    errors: int = 0


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


def get_valid_files(folder: Path) -> Tuple[List[Path], List[dict]]:
    if not folder.exists():
        return [], [{"file": str(folder), "error": "Dossier introuvable"}]
    valid, errors = [], []
    for f in sorted(folder.iterdir()):
        if not f.is_file():
            continue
        try:
            validate_file(f)
            valid.append(f)
        except (UnsupportedFileTypeError, FileNotFoundError, ValueError) as e:
            errors.append({"file": f.name, "error": str(e)})
    return valid, errors


async def upsert_document_logic(conn, file_path: Path, tender_id: int, uploaded_by: str) -> Tuple[int, bool]:
    """
    Récupère un document s'il existe déjà ou l'insère s'il est absent.
    Retourne (doc_id, already_processed_or_running).
    Utilisé uniquement par le pipeline BATCH — pas par le reprocess unitaire,
    qui force toujours.
    """
    validate_file(file_path)
    file_name = file_path.name
    filetype_id = resolve_filetype_id(file_path)
    file_size = format_file_size(get_file_size_bytes(file_path))
    now = datetime.now()

    doc = await get_document_by_tender_and_name(conn=conn, tender_id=tender_id, file_name=file_name)

    if doc is not None:
        doc_id = doc["id"]
        statut = doc.get("statut_id", 0)

        if statut == DOCUMENT_STATUS_DONE:
            logger.info("'%s' déjà traité (id=%s), ignoré.", file_name, doc_id)
            return doc_id, True

        if statut == DOCUMENT_STATUS_PROCESSING:
            logger.warning(
                "'%s' était en statut PROCESSING (probable interruption anormale), relance du traitement.",
                file_name,
            )
            return doc_id, False

        logger.info("'%s' trouvé en BDD (statut=%s), lancement du traitement.", file_name, statut)
        return doc_id, False

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
    logger.info("'%s' non présent en BDD, créé (id=%s).", file_name, doc_id)
    return doc_id, False


async def _process_chunk_extract_requirement(
    chunk: str,
    previous_chunk: str | None,
    previous_product_name: str | None,
    conn,
    tender_id: int,
    tender_document_id: int,
    current_product_id: int | None,
    technical_lots: list[dict] | None = None,
) -> Tuple[int | None, str | None]:
    extracted_container = await extract_tender_products(
        chunk=chunk,
        previous_chunk=previous_chunk,
        previous_product_name=previous_product_name,
        technical_lots=technical_lots,
    )

    for produit in extracted_container.produits:
        designation = produit.nom_produit.strip()
        if not designation:
            continue
        normalized_designation = designation.casefold().strip(" .:-")
        if normalized_designation in {
            "aucun produit",
            "aucun produit identifié",
            "aucun produit identifie",
            "pas de produit",
            "no product",
        }:
            logger.info("Placeholder LLM ignoré : %r", designation)
            continue

        # Les petits modèles locaux peuvent renvoyer 0 ou un identifiant
        # inventé malgré la consigne "null". Ne jamais envoyer cette valeur à
        # PostgreSQL : seuls les IDs réellement fournis au modèle sont valides.
        valid_lot_ids = {
            lot_id
            for lot in (technical_lots or [])
            if isinstance((lot_id := lot.get("id")), int)
        }
        technical_lot_id = (
            produit.technical_lot_id
            if produit.technical_lot_id in valid_lot_ids
            else None
        )
        if produit.technical_lot_id is not None and technical_lot_id is None:
            logger.warning(
                "Lot technique LLM invalide ignoré pour '%s' : %s (valides=%s)",
                designation,
                produit.technical_lot_id,
                sorted(valid_lot_ids),
            )

        same_as_previous = (
            previous_product_name is not None
            and normalized_designation
            == previous_product_name.casefold().strip(" .:-")
        )
        if current_product_id is not None and (
            produit.PREVIOUS_PRODUCT == "Oui" or same_as_previous
        ):
            # Les tableaux qui se poursuivent d'un chunk à l'autre répètent
            # souvent le nom du produit. Un petit modèle local peut oublier le
            # drapeau PREVIOUS_PRODUCT ; le nom normalisé évite alors de créer
            # plusieurs produits identiques et rattache les exigences au bon.
            pass
        else:
            current_product_id = await insert_product(
                conn=conn,
                designation=designation,
                tender_id=tender_id,
                tender_document_id=tender_document_id,
                technical_lot_id=technical_lot_id,
            )
            previous_product_name = designation

        if current_product_id is None:
            raise RuntimeError(f"Impossible de résoudre le product_id pour '{designation}'.")

        for exigence in produit.exigences:
            req_name = exigence.nom_exigence.strip()
            if not req_name:
                continue
            await insert_requirement(
                conn=conn,
                requirement=req_name,
                operateur=exigence.operateur,
                value=exigence.valeur,
                product_id=current_product_id,
            )

    return current_product_id, previous_product_name


async def _extract_document_chunks(
    document_id: int,
    file_path: Path,
    tender_id: int,
    uploaded_by: str,
    technical_lots: list[dict],
) -> int:
    pool = await get_pool()

    text = await load_document(str(file_path))
    chunks = await asyncio.to_thread(split_document, text)
    total = len(chunks)

    if total == 0:
        raise ValueError(f"Aucun chunk extrait de {file_path.name}.")

    async with pool.connection() as conn, pool.connection() as conn_progress:
        now = datetime.now()

        async with conn_progress.transaction():
            await initialize_document_processing(
                conn=conn_progress, document_id=document_id,
                count_chunks=total, updated_at=now, updated_by=uploaded_by,
            )

        async with conn.transaction():
            # conn ne touche plus QUE les produits/exigences — jamais tenders_documents.
            await delete_products_by_document(conn=conn, tender_document_id=document_id)

            current_product_id: int | None = None
            previous_product_name: str | None = None
            previous_chunk: str | None = None

            for i, chunk in enumerate(chunks, start=1):
                current_product_id, previous_product_name = await _process_chunk_extract_requirement(
                    chunk=chunk,
                    previous_chunk=previous_chunk,
                    previous_product_name=previous_product_name,
                    conn=conn,
                    tender_id=tender_id,
                    tender_document_id=document_id,
                    current_product_id=current_product_id,
                    technical_lots=technical_lots,
                )

                now = datetime.now()
                async with conn_progress.transaction():
                    await mark_document_chunk_processed(
                        conn=conn_progress, document_id=document_id,
                        count_chunks=total, nb_chunks_done=i,
                        updated_at=now, updated_by=uploaded_by,
                    )

                previous_chunk = chunk

        now = datetime.now()
        async with conn_progress.transaction():
            await finalize_document_processing(
                conn=conn_progress, document_id=document_id,
                count_chunks=total, nb_chunks_done=total,
                updated_at=now, updated_by=uploaded_by,
            )

    return total


async def _mark_document_error(document_id: int, uploaded_by: str) -> None:
    pool = await get_pool()
    try:
        async with pool.connection() as conn_err:
            async with conn_err.transaction():
                await mark_document_processing_error(
                    conn=conn_err, document_id=document_id,
                    updated_at=datetime.now(), updated_by=uploaded_by,
                )
    except Exception:
        logger.exception("Marquage de l'erreur échoué en BDD pour document_id=%s", document_id)


async def _recompute_tender_status(conn, tender_id: int) -> None:
    documents = await get_documents_by_tender(conn, tender_id)
    if not documents:
        return

    statuses = {d["statut_id"] for d in documents}

    if statuses == {DOCUMENT_STATUS_DONE}:
        final_status = TENDER_STATUS_EXTRACTION_DONE
    elif DOCUMENT_STATUS_ERROR in statuses:
        final_status = TENDER_STATUS_ERROR
    else:
        final_status = TENDER_STATUS_EXTRACTION_IN_PROGRESS

    await update_tender_status(conn=conn, tender_id=tender_id, status_id=final_status)


async def _process_single_file(
    file_path: Path,
    tender_id: int,
    uploaded_by: str,
    technical_lots: list[dict],
    stats: PipelineStats,
) -> None:
    pool = await get_pool()
    document_id: int | None = None

    try:
        async with pool.connection() as conn:
            async with conn.transaction():
                document_id, already_processed = await upsert_document_logic(
                    conn=conn, file_path=file_path, tender_id=tender_id, uploaded_by=uploaded_by,
                )

        if already_processed:
            stats.skipped += 1
            return

        await _extract_document_chunks(
            document_id=document_id, file_path=file_path, tender_id=tender_id,
            uploaded_by=uploaded_by, technical_lots=technical_lots,
        )

        stats.processed += 1
        logger.info("Traitement réussi : %s.", file_path.name)

    except Exception:
        stats.errors += 1
        logger.exception("Erreur lors du traitement de %s", file_path.name)
        if document_id is not None:
            await _mark_document_error(document_id, uploaded_by)


async def run_tender_requirements_pipeline(tender_id: int, uploaded_by: str = "API") -> PipelineStats:
    folder = Path(AO_DATA_DIR) / str(tender_id)
    valid_files, file_errors = get_valid_files(folder)
    stats = PipelineStats(errors=len(file_errors))

    for err in file_errors:
        logger.warning("%s : %s", err["file"], err["error"])

    if not valid_files:
        logger.info("Aucun fichier valide dans %s", folder)
        return stats

    pool = await get_pool()

    async with pool.connection() as conn:
        async with conn.transaction():
            rows = await get_all_technical_lots(conn)
            technical_lots = [
                {"id": r["id"], "name": r["name"], "description": r["description"]} for r in rows
            ]
            await update_tender_status(conn, tender_id=tender_id, status_id=TENDER_STATUS_EXTRACTION_IN_PROGRESS)

    for file_path in valid_files:
        await _process_single_file(
            file_path=file_path,
            tender_id=tender_id,
            uploaded_by=uploaded_by,
            technical_lots=technical_lots,
            stats=stats,
        )

    final_status = TENDER_STATUS_EXTRACTION_DONE if stats.errors == 0 else TENDER_STATUS_ERROR
    async with pool.connection() as conn:
        async with conn.transaction():
            await update_tender_status(conn=conn, tender_id=tender_id, status_id=final_status)

    logger.info(
        "Tender %d terminé. Traités=%d, Ignorés=%d, Erreurs=%d",
        tender_id, stats.processed, stats.skipped, stats.errors,
    )
    return stats


async def reprocess_single_document(document_id: int, uploaded_by: str = "API") -> dict:
    pool = await get_pool()

    async with pool.connection() as conn:
        doc = await get_document_by_id(conn, document_id)

    if doc is None:
        raise ValueError(f"Document {document_id} introuvable.")

    tender_id = doc["tender_id"]
    file_path = Path(doc["path"])

    try:
        validate_file(file_path)
    except (FileNotFoundError, ValueError, UnsupportedFileTypeError) as e:
        await _mark_document_error(document_id, uploaded_by)
        raise ValueError(f"Fichier invalide pour le document {document_id} : {e}") from e

    async with pool.connection() as conn:
        async with conn.transaction():
            rows = await get_all_technical_lots(conn)
            technical_lots = [
                {"id": r["id"], "name": r["name"], "description": r["description"]} for r in rows
            ]

    try:
        total_chunks = await _extract_document_chunks(
            document_id=document_id, file_path=file_path, tender_id=tender_id,
            uploaded_by=uploaded_by, technical_lots=technical_lots,
        )
        logger.info("Reprocess réussi : document_id=%s (%d chunks).", document_id, total_chunks)

        async with pool.connection() as conn:
            async with conn.transaction():
                await _recompute_tender_status(conn, tender_id)

        return {
            "success": True,
            "document_id": document_id,
            "tender_id": tender_id,
            "chunks_processed": total_chunks,
            "message": f"Document retraité avec succès ({total_chunks} chunks).",
        }

    except Exception as e:
        logger.exception("Échec du reprocess pour document_id=%s", document_id)
        await _mark_document_error(document_id, uploaded_by)

        async with pool.connection() as conn:
            async with conn.transaction():
                await _recompute_tender_status(conn, tender_id)

        raise

def launch_tender_pipeline_background(tender_id: int, uploaded_by: str) -> None:
    task = asyncio.create_task(run_tender_requirements_pipeline(tender_id, uploaded_by))
    track_task(task, f"Reprocess document {tender_id}")

def launch_reprocess_background(document_id: int, uploaded_by: str) -> None:
    task = asyncio.create_task(reprocess_single_document(document_id, uploaded_by))
    track_task(task, f"Reprocess document {document_id}")
