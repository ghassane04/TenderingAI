from datetime import datetime
from psycopg.rows import dict_row

_SQL_INSERT_OR_UPDATE = """
INSERT INTO tender_lots_pdfs (
    tender_id, technical_lot_id, lot_name,
    filename, file_path, file_size,
    generated_at, generated_by
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (tender_id, technical_lot_id) DO UPDATE SET
    lot_name = EXCLUDED.lot_name,
    filename = EXCLUDED.filename,
    file_path = EXCLUDED.file_path,
    file_size = EXCLUDED.file_size,
    generated_at = EXCLUDED.generated_at,
    generated_by = EXCLUDED.generated_by
"""

async def upsert_pdf_record(
    conn,
    tender_id: int,
    technical_lot_id: int,
    lot_name: str,
    filename: str,
    file_path: str,
    file_size: str,
    generated_by: str = "SYSTEM",
) -> None:
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_INSERT_OR_UPDATE,
            (
                tender_id, technical_lot_id, lot_name,
                filename, file_path, file_size,
                datetime.now(), generated_by,
            ),
        )


_SQL_GET_PDFS_BY_TENDER = """
SELECT
    p.id, p.tender_id, p.technical_lot_id, p.lot_name,
    p.filename, p.file_path, p.file_size,
    p.generated_at, p.generated_by,
    tl.name AS technical_lot_name
FROM tender_lots_pdfs p
LEFT JOIN technical_lot tl ON tl.id = p.technical_lot_id
WHERE p.tender_id = %s
ORDER BY p.technical_lot_id
"""

async def get_pdfs_by_tender(conn, tender_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_PDFS_BY_TENDER, (tender_id,))
        return await cur.fetchall()


_SQL_GET_PDF_BY_ID = """
SELECT
    p.id, p.tender_id, p.technical_lot_id, p.lot_name,
    p.filename, p.file_path, p.file_size,
    p.generated_at, p.generated_by
FROM tender_lots_pdfs p
WHERE p.id = %s
"""

async def get_pdf_by_id(conn, pdf_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_PDF_BY_ID, (pdf_id,))
        return await cur.fetchone()


_SQL_GET_PDFS_BY_TENDER_AND_LOT = """
SELECT id, filename, file_path, file_size, generated_at
FROM tender_lots_pdfs
WHERE tender_id = %s AND technical_lot_id = %s
LIMIT 1
"""

async def get_pdf_by_tender_and_lot(conn, tender_id: int, technical_lot_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_PDFS_BY_TENDER_AND_LOT, (tender_id, technical_lot_id))
        return await cur.fetchone()


_SQL_DELETE_BY_TENDER = "DELETE FROM tender_lots_pdfs WHERE tender_id = %s"

async def delete_pdfs_by_tender(conn, tender_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_BY_TENDER, (tender_id,))