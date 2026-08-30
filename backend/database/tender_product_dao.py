from psycopg.rows import dict_row


_SQL_GET_TENDER_PRODUCTS_BY_ID = """
SELECT tp.id, tp.designation, tp.tender_id, tp.tender_document_id,
       tp.technical_lot_id, tl.name AS technical_lot_name
FROM tenders_products tp
LEFT JOIN technical_lot tl ON tl.id = tp.technical_lot_id
WHERE tp.tender_id = %s
ORDER BY tp.id
"""

async def get_tender_products_by_id(conn, tender_id: int) -> list[dict]:
    """Récupère tous les produits d'un tender, avec le nom de leur lot technique."""
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_TENDER_PRODUCTS_BY_ID, (tender_id,))
        return await cur.fetchall()


_SQL_GET_TENDER_PRODUCT_BY_ID = """
SELECT tp.id, tp.designation, tp.tender_id, tp.tender_document_id,
       tp.technical_lot_id, tl.name AS technical_lot_name
FROM tenders_products tp
LEFT JOIN technical_lot tl ON tl.id = tp.technical_lot_id
WHERE tp.id = %s
"""

async def get_tender_product_by_id(conn, product_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_TENDER_PRODUCT_BY_ID, (product_id,))
        return await cur.fetchone()


_SQL_GET_TENDER_PRODUCTS_BY_ID_AND_LOT = """
SELECT tp.id, tp.designation
FROM tenders_products tp
WHERE tp.tender_id = %s AND tp.technical_lot_id = %s
ORDER BY tp.id
"""

async def get_tender_products_by_id_and_lot(conn, tender_id: int, technical_lot_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_TENDER_PRODUCTS_BY_ID_AND_LOT, (tender_id, technical_lot_id))
        return await cur.fetchall()


_SQL_GET_TENDER_PRODUCTS_BY_DOCUMENT = """
SELECT tp.id, tp.designation, tp.technical_lot_id
FROM tenders_products tp
WHERE tp.tender_document_id = %s
ORDER BY tp.id
"""

async def get_tender_products_by_document(conn, tender_document_id: int) -> list[dict]:
    """Récupère tous les produits extraits d'un document spécifique (utile pour debug/re-extraction)."""
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_TENDER_PRODUCTS_BY_DOCUMENT, (tender_document_id,))
        return await cur.fetchall()


_SQL_INSERT_TENDER_PRODUCT = """
INSERT INTO tenders_products (designation, tender_id, tender_document_id, technical_lot_id)
VALUES (%s, %s, %s, %s)
RETURNING id
"""

async def insert_product(
    conn,
    designation: str,
    tender_id: int,
    tender_document_id: int | None = None,
    technical_lot_id: int | None = None,
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_INSERT_TENDER_PRODUCT,
            (designation, tender_id, tender_document_id, technical_lot_id),
        )
        row = await cur.fetchone()
        return row[0]


_SQL_UPDATE_TENDER_PRODUCT = """
UPDATE tenders_products
SET designation = %s, technical_lot_id = %s
WHERE id = %s
"""

async def update_tender_product(conn, designation: str, technical_lot_id: int | None, product_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_UPDATE_TENDER_PRODUCT, (designation, technical_lot_id, product_id))


_SQL_DELETE_TENDER_PRODUCT = "DELETE FROM tenders_products WHERE id = %s"

async def delete_tender_product(conn, product_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_TENDER_PRODUCT, (product_id,))
        return cur.rowcount > 0

_SQL_DELETE_PRODUCTS_BY_DOCUMENT = "DELETE FROM tenders_products WHERE tender_document_id = %s"

async def delete_products_by_document(conn, tender_document_id: int) -> None:

    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_PRODUCTS_BY_DOCUMENT, (tender_document_id,))