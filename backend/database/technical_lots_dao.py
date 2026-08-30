from datetime import datetime
from psycopg.rows import dict_row


_SQL_GET_ALL_LOTS = """
SELECT id, name, description, is_system, created_at, updated_at
FROM technical_lot
ORDER BY name
"""

async def get_all_technical_lots(conn) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_ALL_LOTS)
        return await cur.fetchall()


_SQL_GET_LOT_BY_ID = """
SELECT id, name, description, is_system, created_at, updated_at
FROM technical_lot WHERE id = %s
"""

async def get_technical_lot_by_id(conn, lot_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_LOT_BY_ID, (lot_id,))
        return await cur.fetchone()


_SQL_GET_LOT_BY_NAME = """
SELECT id, name, description
FROM technical_lot
WHERE LOWER(TRIM(name)) = LOWER(TRIM(%s))
"""

async def get_technical_lot_by_name(conn, name: str) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_LOT_BY_NAME, (name,))
        return await cur.fetchone()


_SQL_INSERT_LOT = """
INSERT INTO technical_lot (name, description, created_at, updated_at)
VALUES (%s, %s, %s, %s)
RETURNING id
"""

async def insert_technical_lot(conn, name: str, description: str) -> int:
    now = datetime.now()
    async with conn.cursor() as cur:
        await cur.execute(_SQL_INSERT_LOT, (name.strip(), description.strip(), now, now))
        row = await cur.fetchone()
        return row[0]


_SQL_UPDATE_LOT = """
UPDATE technical_lot SET name = %s, description = %s, updated_at = %s WHERE id = %s
"""

async def update_technical_lot(conn, lot_id: int, name: str, description: str) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_UPDATE_LOT, (name.strip(), description.strip(), datetime.now(), lot_id))


_SQL_DELETE_LOT = "DELETE FROM technical_lot WHERE id = %s"

async def delete_technical_lot(conn, lot_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_LOT, (lot_id,))