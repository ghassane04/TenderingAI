from datetime import datetime
from psycopg.rows import dict_row

_SQL_GET_LOTS_BY_TENDER = """
SELECT
    tsl.id AS tsl_id, tsl.tender_id, tsl.supplier_id, tsl.technical_lot_id,
    tsl.status_id, tsls.name AS status_name, tsl.created_at,
    s.company_name AS supplier_name, s.email AS supplier_email,
    l.name AS lot_name,
    le.last_sent_at, le.last_received_at
FROM tender_supplier_lots tsl
JOIN suppliers s ON s.id = tsl.supplier_id
JOIN technical_lot l ON l.id = tsl.technical_lot_id
LEFT JOIN tender_supplier_lots_status tsls ON tsls.id = tsl.status_id
LEFT JOIN (
    SELECT
        tsl_id,
        MAX(CASE WHEN direction = 'outbound' THEN sent_at END) AS last_sent_at,
        MAX(CASE WHEN direction = 'inbound' THEN received_at END) AS last_received_at
    FROM tender_supplier_lot_emails
    WHERE tsl_id IS NOT NULL
    GROUP BY tsl_id
) le ON le.tsl_id = tsl.id
WHERE tsl.tender_id = %s
ORDER BY tsls.id, l.name, s.company_name
"""

async def get_lots_by_tender(conn, tender_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_LOTS_BY_TENDER, (tender_id,))
        return await cur.fetchall()


_SQL_GET_LOT_BY_ID = """
SELECT tsl.id AS tsl_id, tsl.tender_id, tsl.supplier_id, tsl.technical_lot_id,
       tsl.status_id, tsls.name AS status_name, tsl.created_at,
       s.company_name AS supplier_name, s.email AS supplier_email,
       l.name AS lot_name,
       t.code AS tender_code, t.designation AS tender_designation, t.nom_client AS tender_client
FROM tender_supplier_lots tsl
JOIN suppliers s ON s.id = tsl.supplier_id
JOIN technical_lot l ON l.id = tsl.technical_lot_id
LEFT JOIN tender_supplier_lots_status tsls ON tsls.id = tsl.status_id
LEFT JOIN tenders t ON t.id = tsl.tender_id
WHERE tsl.id = %s
"""

async def get_lot_by_id(conn, tsl_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_LOT_BY_ID, (tsl_id,))
        return await cur.fetchone()


_SQL_GET_LOTS_BY_TENDER_AND_STATUS = """
SELECT tsl.id AS tsl_id, tsl.supplier_id, tsl.technical_lot_id,
       tsl.status_id, tsls.name AS status_name, tsl.created_at,
       s.company_name AS supplier_name, s.email AS supplier_email,
       l.name AS lot_name
FROM tender_supplier_lots tsl
JOIN suppliers s ON s.id = tsl.supplier_id
JOIN technical_lot l ON l.id = tsl.technical_lot_id
LEFT JOIN tender_supplier_lots_status tsls ON tsls.id = tsl.status_id
WHERE tsl.tender_id = %s AND tsl.status_id = %s
ORDER BY l.name, s.company_name
"""

async def get_lots_by_tender_and_status(conn, tender_id: int, status_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_LOTS_BY_TENDER_AND_STATUS, (tender_id, status_id))
        return await cur.fetchall()


_SQL_INSERT_TSL = """
INSERT INTO tender_supplier_lots (tender_id, supplier_id, technical_lot_id, status_id, created_at)
VALUES (%s, %s, %s, %s, %s)
RETURNING id
"""

_SQL_GET_SUPPLIERS_BY_TENDER_AND_LOT = """
SELECT tsl.supplier_id, s.company_name AS supplier_name
FROM tender_supplier_lots tsl
JOIN suppliers s ON s.id = tsl.supplier_id
WHERE tsl.tender_id = %s AND tsl.technical_lot_id = %s
ORDER BY s.company_name
"""

async def get_suppliers_by_tender_and_lot(conn, tender_id: int, technical_lot_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_SUPPLIERS_BY_TENDER_AND_LOT, (tender_id, technical_lot_id))
        return await cur.fetchall()

async def insert_tender_supplier_lot(
    conn,
    tender_id: int,
    supplier_id: int,
    technical_lot_id: int,
    status_id: int = 1,
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_INSERT_TSL,
            (tender_id, supplier_id, technical_lot_id, status_id, datetime.now()),
        )
        row = await cur.fetchone()
        return row[0]


_SQL_UPDATE_TSL_STATUS = "UPDATE tender_supplier_lots SET status_id = %s WHERE id = %s"

async def update_tsl_status(conn, tsl_id: int, status_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_UPDATE_TSL_STATUS, (status_id, tsl_id))


_SQL_DELETE_TSL = "DELETE FROM tender_supplier_lots WHERE id = %s"

async def delete_tender_supplier_lot(conn, tsl_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_TSL, (tsl_id,))
        return cur.rowcount > 0


_SQL_DELETE_TSL_BY_TENDER = "DELETE FROM tender_supplier_lots WHERE tender_id = %s"

async def delete_lots_by_tender(conn, tender_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_TSL_BY_TENDER, (tender_id,))