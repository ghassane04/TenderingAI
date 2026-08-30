from datetime import datetime
from psycopg.rows import dict_row

_SQL_GET_DATASHEET_BY_ID = """
SELECT
    sd.id, sd.file_path, sd.designation, sd.file_size,
    sd.supplier_id, s.company_name,
    sd.tender_id, t.designation AS tender_designation,
    sd.supplier_datasheet_status_id,
    sds.name AS status_name,
    sd.uploaded_at, sd.uploaded_by, sd.updated_at, sd.updated_by,
    sd.technical_lot_id, tl.name AS lot_name,
    sd.filetype_id, dt.name AS filetype
FROM supplier_datasheets sd
JOIN suppliers s ON s.id = sd.supplier_id
LEFT JOIN supplier_datasheet_status sds ON sds.id = sd.supplier_datasheet_status_id
LEFT JOIN technical_lot tl ON tl.id = sd.technical_lot_id
LEFT JOIN documents_type dt ON dt.id = sd.filetype_id
LEFT JOIN tenders t ON sd.tender_id = t.id
WHERE sd.id = %s
"""

async def get_datasheet_by_id(conn, datasheet_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_DATASHEET_BY_ID, (datasheet_id,))
        return await cur.fetchone()


_SQL_GET_DATASHEETS_BY_TENDER = """
SELECT
    sd.id, sd.designation, sd.file_path, sd.file_size,
    sd.supplier_id, s.company_name AS supplier_name,
    sd.supplier_datasheet_status_id, sds.name AS status,
    sd.technical_lot_id, tl.name AS lot_name,
    sd.uploaded_at, sd.uploaded_by,
    agg.products_count
FROM supplier_datasheets sd
LEFT JOIN suppliers s ON s.id = sd.supplier_id
LEFT JOIN supplier_datasheet_status sds ON sds.id = sd.supplier_datasheet_status_id
LEFT JOIN technical_lot tl ON tl.id = sd.technical_lot_id
LEFT JOIN (
    SELECT
        sp.supplier_datasheet_id,
        COUNT(sp.id) AS products_count
    FROM suppliers_products sp
    LEFT JOIN supplier_product_comparison_results spcr ON spcr.supplier_product_id = sp.id
    GROUP BY sp.supplier_datasheet_id
) agg ON agg.supplier_datasheet_id = sd.id
WHERE sd.tender_id = %s
ORDER BY sd.id
"""

async def get_datasheets_by_tender(conn, tender_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_DATASHEETS_BY_TENDER, (tender_id,))
        return await cur.fetchall()

_SQL_GET_DATASHEET_BY_TENDER_SUPPLIER_AND_NAME = """
SELECT id, designation, supplier_datasheet_status_id
FROM supplier_datasheets
WHERE tender_id = %s AND supplier_id = %s AND designation = %s
LIMIT 1
"""

async def get_datasheet_by_tender_supplier_and_name(
    conn, tender_id: int, supplier_id: int, designation: str,
) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            _SQL_GET_DATASHEET_BY_TENDER_SUPPLIER_AND_NAME,
            (tender_id, supplier_id, designation),
        )
        return await cur.fetchone()


_SQL_INSERT_DATASHEET = """
INSERT INTO supplier_datasheets (
    designation, file_path, uploaded_at, uploaded_by,
    supplier_id, tender_id, technical_lot_id, filetype_id, supplier_datasheet_status_id, file_size
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
RETURNING id
"""

async def insert_datasheet(
    conn,
    designation: str,
    file_path: str,
    uploaded_at,
    uploaded_by: str,
    supplier_id: int,
    tender_id: int,
    technical_lot_id: int | None,
    filetype_id: int,
    file_size: str,
    status_id: int = 1,
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_INSERT_DATASHEET,
            (
                designation, str(file_path),
                uploaded_at, uploaded_by,
                supplier_id, tender_id,
                technical_lot_id,
                filetype_id, status_id, file_size,
            ),
        )
        row = await cur.fetchone()
        return row[0]


_SQL_UPDATE_DATASHEET_STATUS = """
UPDATE supplier_datasheets
SET supplier_datasheet_status_id = %s, updated_at = %s, updated_by = %s
WHERE id = %s
"""

async def update_datasheet_status(
    conn,
    datasheet_id: int,
    supplier_datasheet_status_id: int,
    updated_at,
    updated_by: str,
) -> None:
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_UPDATE_DATASHEET_STATUS,
            (supplier_datasheet_status_id, updated_at, updated_by, datasheet_id),
        )