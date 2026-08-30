from pathlib import Path
from psycopg.rows import dict_row

DOCUMENT_STATUS_WAITING = 1
DOCUMENT_STATUS_PROCESSING = 2
DOCUMENT_STATUS_DONE = 3
DOCUMENT_STATUS_ERROR = 4


_SQL_GET_DOCUMENTS_BY_TENDER = """
SELECT
    td.id, td.designation, td.path, td.file_size,
    td.count_chunks, td.nb_chunks_done,
    td.uploaded_at, td.uploaded_by, td.updated_at, td.updated_by,
    td.filetype_id, dt.name AS filetype,
    td.statut_id, ds.name AS statut_name
FROM tenders_documents td
LEFT JOIN documents_type dt ON dt.id = td.filetype_id
LEFT JOIN document_status ds ON ds.id = td.statut_id
WHERE td.tender_id = %s
ORDER BY td.id
"""

async def get_documents_by_tender(conn, tender_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_DOCUMENTS_BY_TENDER, (tender_id,))
        return await cur.fetchall()


_SQL_GET_DOCUMENT_BY_ID = """
SELECT
    td.id, td.designation, td.path, td.file_size,
    td.count_chunks, td.nb_chunks_done,
    td.uploaded_at, td.uploaded_by, td.updated_at, td.updated_by,
    td.filetype_id, dt.name AS filetype,
    td.statut_id, ds.name AS statut_name,
    td.tender_id
FROM tenders_documents td
LEFT JOIN documents_type dt ON dt.id = td.filetype_id
LEFT JOIN document_status ds ON ds.id = td.statut_id
WHERE td.id = %s
"""

async def get_document_by_id(conn, document_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_DOCUMENT_BY_ID, (document_id,))
        return await cur.fetchone()


_SQL_INSERT_DOCUMENT = """
INSERT INTO tenders_documents (
    designation, count_chunks, nb_chunks_done, path,
    uploaded_at, uploaded_by, updated_at, updated_by,
    tender_id, filetype_id, statut_id, file_size
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
RETURNING id
"""

async def insert_document(
    conn, designation: str, count_chunks: int, nb_chunks_done: int,
    path: str, uploaded_at, uploaded_by: str, updated_at, updated_by: str,
    tender_id: int, filetype_id: int, statut_id: int, file_size: str,
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_INSERT_DOCUMENT, (
            designation, count_chunks, nb_chunks_done, path,
            uploaded_at, uploaded_by, updated_at, updated_by,
            tender_id, filetype_id, statut_id, file_size,
        ))
        row = await cur.fetchone()
        return row[0]


_SQL_GET_DOCUMENT_BY_TENDER_AND_NAME = """
SELECT id, designation, path, tender_id, filetype_id, statut_id,
       count_chunks, nb_chunks_done, file_size
FROM tenders_documents
WHERE tender_id = %s
  AND LOWER(TRIM(designation)) = LOWER(TRIM(%s))
ORDER BY id DESC
LIMIT 2
"""

async def get_document_by_tender_and_name(conn, tender_id: int, file_name: str) -> dict | None:
    """
    Recherche un document par tender_id + nom de fichier (designation).
    Retourne None si introuvable (au lieu de lever une exception — laisse
    l'appelant décider s'il s'agit d'un cas normal "à créer" ou d'une erreur).
    """
    if not file_name or not file_name.strip():
        raise ValueError("file_name est requis")

    clean_name = Path(file_name).name.strip()

    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_DOCUMENT_BY_TENDER_AND_NAME, (tender_id, clean_name))
        rows = await cur.fetchall()

    if not rows:
        return None

    if len(rows) > 1:
        import logging
        logging.getLogger(__name__).warning(
            "%d documents trouvés pour tender_id=%s, fichier='%s'. Utilisation du plus récent (id=%s).",
            len(rows), tender_id, clean_name, rows[0]["id"],
        )

    return rows[0]


_SQL_UPDATE_DOCUMENT_STATUS = """
UPDATE tenders_documents
SET statut_id = %s, updated_at = %s, updated_by = %s
WHERE id = %s
"""

async def update_document_status(conn, document_id: int, statut_id: int, updated_at, updated_by: str) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_UPDATE_DOCUMENT_STATUS, (statut_id, updated_at, updated_by, document_id))


_SQL_RESTORE_DOCUMENT_FILE = """
UPDATE tenders_documents
SET path = %s,
    file_size = %s,
    filetype_id = %s,
    statut_id = %s,
    count_chunks = 0,
    nb_chunks_done = 0,
    updated_at = %s,
    updated_by = %s
WHERE id = %s
"""


async def restore_document_file(
    conn,
    document_id: int,
    path: str,
    file_size: str,
    filetype_id: int,
    updated_at,
    updated_by: str,
) -> None:
    """Répare une ligne existante dont le fichier physique a disparu."""
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_RESTORE_DOCUMENT_FILE,
            (
                path,
                file_size,
                filetype_id,
                DOCUMENT_STATUS_WAITING,
                updated_at,
                updated_by,
                document_id,
            ),
        )


_SQL_UPDATE_DOCUMENT_CHUNK_COUNTS = """
UPDATE tenders_documents
SET count_chunks = %s, nb_chunks_done = %s, updated_at = %s, updated_by = %s
WHERE id = %s
"""

async def update_document_chunk_counts(
    conn, document_id: int, count_chunks: int,
    nb_chunks_done: int, updated_at, updated_by: str,
) -> None:
    safe_total = max(0, int(count_chunks))
    safe_done = max(0, min(int(nb_chunks_done), safe_total))
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_UPDATE_DOCUMENT_CHUNK_COUNTS,
            (safe_total, safe_done, updated_at, updated_by, document_id),
        )


async def initialize_document_processing(
    conn, document_id: int, count_chunks: int, updated_at, updated_by: str,
) -> None:
    await update_document_chunk_counts(conn, document_id, count_chunks, 0, updated_at, updated_by)
    await update_document_status(conn, document_id, DOCUMENT_STATUS_PROCESSING, updated_at, updated_by)


async def mark_document_chunk_processed(
    conn, document_id: int, count_chunks: int,
    nb_chunks_done: int, updated_at, updated_by: str,
) -> None:
    await update_document_chunk_counts(conn, document_id, count_chunks, nb_chunks_done, updated_at, updated_by)


async def finalize_document_processing(
    conn, document_id: int, count_chunks: int,
    nb_chunks_done: int, updated_at, updated_by: str,
) -> None:
    safe_total = max(0, int(count_chunks))
    safe_done = max(0, min(int(nb_chunks_done), safe_total))

    await update_document_chunk_counts(conn, document_id, safe_total, safe_done, updated_at, updated_by)

    if safe_done != safe_total:
        raise ValueError(
            f"Impossible de finaliser le document {document_id} : "
            f"nb_chunks_done={safe_done} != count_chunks={safe_total}"
        )
    await update_document_status(conn, document_id, DOCUMENT_STATUS_DONE, updated_at, updated_by)


async def mark_document_processing_error(conn, document_id: int, updated_at, updated_by: str) -> None:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            UPDATE tenders_documents
            SET statut_id = %s, nb_chunks_done = 0, updated_at = %s, updated_by = %s
            WHERE id = %s
            """,
            (DOCUMENT_STATUS_ERROR, updated_at, updated_by, document_id),
        )


_SQL_DELETE_DOCUMENT = "DELETE FROM tenders_documents WHERE id = %s"

async def delete_document_by_id(conn, document_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_DOCUMENT, (document_id,))
        return cur.rowcount > 0
