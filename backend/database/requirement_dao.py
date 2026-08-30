from psycopg.rows import dict_row


_SQL_GET_REQUIREMENTS_BY_PRODUCT = """
SELECT id, requirement, operateur, value
FROM tenders_products_requirements
WHERE product_id = %s
ORDER BY id
"""

async def get_product_requirements_by_id(conn, product_id: int) -> list[dict]:
    """Récupère toutes les exigences d'un produit."""
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_REQUIREMENTS_BY_PRODUCT, (product_id,))
        return await cur.fetchall()


_SQL_GET_REQUIREMENT_BY_ID = """
SELECT id, requirement, operateur, value, product_id
FROM tenders_products_requirements
WHERE id = %s
"""

async def get_requirement_by_id(conn, requirement_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_REQUIREMENT_BY_ID, (requirement_id,))
        return await cur.fetchone()


_SQL_INSERT_REQUIREMENT = """
INSERT INTO tenders_products_requirements (requirement, operateur, value, product_id)
VALUES (%s, %s, %s, %s)
RETURNING id
"""

async def insert_requirement(conn, requirement: str, operateur: str, value: str, product_id: int) -> int:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_INSERT_REQUIREMENT, (requirement, operateur, value, product_id))
        row = await cur.fetchone()
        return row[0]


_SQL_UPDATE_REQUIREMENT = """
UPDATE tenders_products_requirements
SET requirement = %s, operateur = %s, value = %s
WHERE id = %s
"""

async def update_requirement(conn, requirement_id: int, requirement: str, operateur: str, value: str) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_UPDATE_REQUIREMENT, (requirement, operateur, value, requirement_id))


_SQL_DELETE_REQUIREMENT = "DELETE FROM tenders_products_requirements WHERE id = %s"

async def delete_requirement(conn, requirement_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_REQUIREMENT, (requirement_id,))
        return cur.rowcount > 0


_SQL_DELETE_REQUIREMENTS_BY_PRODUCT = "DELETE FROM tenders_products_requirements WHERE product_id = %s"

async def delete_requirements_by_product(conn, product_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_REQUIREMENTS_BY_PRODUCT, (product_id,))