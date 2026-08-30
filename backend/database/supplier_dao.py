from datetime import datetime
from psycopg.rows import dict_row

_SQL_GET_ALL_SUPPLIERS = """
SELECT id, company_name, email, description, created_at, updated_at
FROM suppliers
ORDER BY company_name
"""

async def get_all_suppliers(conn) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_ALL_SUPPLIERS)
        return await cur.fetchall()


_SQL_GET_SUPPLIER_BY_ID = """
SELECT id, company_name, email, description, created_at, updated_at
FROM suppliers
WHERE id = %s
"""

async def get_supplier_by_id(conn, supplier_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_SUPPLIER_BY_ID, (supplier_id,))
        return await cur.fetchone()


_SQL_GET_SUPPLIER_BY_EMAIL = """
SELECT id, company_name, email, description FROM suppliers WHERE email = %s
"""

async def get_supplier_by_email(conn, email: str) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_SUPPLIER_BY_EMAIL, (email,))
        return await cur.fetchone()


_SQL_INSERT_SUPPLIER = """
INSERT INTO suppliers (company_name, email, description, created_at, updated_at)
VALUES (%s, %s, %s, %s, %s)
RETURNING id
"""

async def insert_supplier(conn, company_name: str, email: str, description: str) -> int:
    now = datetime.now()
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_INSERT_SUPPLIER,
            (company_name, email, description, now, now),
        )
        row = await cur.fetchone()
        return row[0]


_SQL_UPDATE_SUPPLIER = """
UPDATE suppliers
SET company_name = %s, email = %s, description = %s, updated_at = %s
WHERE id = %s
"""

async def update_supplier(
    conn,
    supplier_id: int,
    company_name: str,
    email: str,
    description: str,
) -> None:
    now = datetime.now()
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_UPDATE_SUPPLIER,
            (company_name, email, description, now, supplier_id),
        )


_SQL_DELETE_SUPPLIER = "DELETE FROM suppliers WHERE id = %s"

async def delete_supplier(conn, supplier_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_SUPPLIER, (supplier_id,))
        return cur.rowcount > 0