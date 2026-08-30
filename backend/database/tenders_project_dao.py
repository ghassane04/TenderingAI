from datetime import datetime
from psycopg.rows import dict_row

TENDER_STATUS_WAITING = 1


_SQL_LIST_TENDERS = """
SELECT t.id, t.code, t.designation, t.nom_client,
       t.uploaded_at, t.uploaded_by, t.updated_at, t.updated_by,
       ts.name AS status_name, t.status_id
FROM tenders t
LEFT JOIN tendering_status ts ON ts.id = t.status_id
ORDER BY t.uploaded_at DESC
"""

async def list_tenders(conn) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_LIST_TENDERS)
        return await cur.fetchall()


_SQL_GET_TENDER_BY_ID = """
SELECT
    t.id, t.code, t.designation, t.nom_client,
    t.uploaded_at, t.uploaded_by, t.updated_at, t.updated_by,
    t.status_id, ts.name AS status_name
FROM tenders t
LEFT JOIN tendering_status ts ON ts.id = t.status_id
WHERE t.id = %s
"""

async def get_tender_by_id(conn, tender_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_TENDER_BY_ID, (tender_id,))
        return await cur.fetchone()

_SQL_GET_TENDER_BY_CODE = """
SELECT id, code, designation, nom_client
FROM tenders
WHERE code = %s
"""

async def get_tender_by_code(conn, code: str) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_TENDER_BY_CODE, (code,))
        return await cur.fetchone()
        
_SQL_INSERT_TENDER = """
INSERT INTO tenders (code, designation, nom_client, uploaded_at, uploaded_by, status_id)
VALUES (%s, %s, %s, %s, %s, %s)
RETURNING id
"""

async def insert_tender(conn, code: str, designation: str, nom_client: str, uploaded_by: str) -> int:
    """Insère un appel d'offre et retourne son ID."""
    now = datetime.now()
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_INSERT_TENDER,
            (code.strip(), designation.strip(), nom_client.strip(), now, uploaded_by, TENDER_STATUS_WAITING),
        )
        row = await cur.fetchone()
        return row[0]


_SQL_GET_TENDER_STATUS = """
SELECT t.id, t.code, t.designation, ts.name AS status,
       COUNT(td.id) AS total_files,
       SUM(CASE WHEN td.statut_id = 3 THEN 1 ELSE 0 END) AS processed_files
FROM tenders t
LEFT JOIN tendering_status ts ON t.status_id = ts.id
LEFT JOIN tenders_documents td ON t.id = td.tender_id
WHERE t.id = %s
GROUP BY t.id, t.code, t.designation, ts.name
"""

async def get_tender_status(conn, tender_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_TENDER_STATUS, (tender_id,))
        return await cur.fetchone()


_SQL_UPDATE_TENDER_STATUS = """
UPDATE tenders
SET status_id = %s
WHERE id = %s
"""

async def update_tender_status(conn, tender_id: int, status_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_UPDATE_TENDER_STATUS, (status_id, tender_id))


_SQL_UPDATE_TENDER_METADATA = """
UPDATE tenders
SET code = %s, designation = %s, nom_client = %s, updated_at = %s, updated_by = %s
WHERE id = %s
"""

async def update_tender_metadata(
    conn, tender_id: int, code: str, designation: str, nom_client: str, updated_by: str,
) -> None:
    now = datetime.now()
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_UPDATE_TENDER_METADATA,
            (code, designation, nom_client, now, updated_by, tender_id),
        )


_SQL_DELETE_TENDER = "DELETE FROM tenders WHERE id = %s"

async def delete_tender(conn, tender_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_TENDER, (tender_id,))