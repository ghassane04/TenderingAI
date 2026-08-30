from psycopg.rows import dict_row

_SQL_GET_SUPPLIER_PRODUCT_BY_ID = """
SELECT
    sp.id, sp.designation, sp.product_id,
    tp.designation AS tender_product_designation,
    sp.supplier_datasheet_id,
    sd.designation AS datasheet_designation,
    sd.supplier_id, s.company_name AS supplier_name,
    sd.tender_id, t.designation AS tender_designation,
    spcr.score
FROM suppliers_products sp
JOIN supplier_datasheets sd ON sd.id = sp.supplier_datasheet_id
LEFT JOIN suppliers s ON sd.supplier_id = s.id
LEFT JOIN tenders t ON sd.tender_id = t.id
LEFT JOIN tenders_products tp ON sp.product_id = tp.id
LEFT JOIN supplier_product_comparison_results spcr ON spcr.supplier_product_id = sp.id
WHERE sp.id = %s
"""

async def get_supplier_product_by_id(conn, supplier_product_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_SUPPLIER_PRODUCT_BY_ID, (supplier_product_id,))
        return await cur.fetchone()


_SQL_GET_SUPPLIER_PRODUCTS_BY_DATASHEET = """
SELECT
    sp.id, sp.designation, sp.product_id, sp.supplier_datasheet_id,
    tp.designation AS tender_product_designation,
    spcr.score
FROM suppliers_products sp
LEFT JOIN tenders_products tp ON tp.id = sp.product_id
LEFT JOIN supplier_product_comparison_results spcr ON spcr.supplier_product_id = sp.id
WHERE sp.supplier_datasheet_id = %s
ORDER BY sp.id
"""

async def get_supplier_products_by_datasheet(conn, supplier_datasheet_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_SUPPLIER_PRODUCTS_BY_DATASHEET, (supplier_datasheet_id,))
        return await cur.fetchall()


_SQL_GET_SUPPLIER_PRODUCTS_BY_TENDER = """
SELECT
    sp.id, sp.designation, sp.product_id,
    tp.designation AS tender_product_designation,
    sp.supplier_datasheet_id,
    sd.designation AS datasheet_designation,
    s.company_name AS supplier_name,
    spcr.score
FROM suppliers_products sp
JOIN supplier_datasheets sd ON sd.id = sp.supplier_datasheet_id
JOIN suppliers s ON s.id = sd.supplier_id
LEFT JOIN tenders_products tp ON tp.id = sp.product_id
LEFT JOIN supplier_product_comparison_results spcr ON spcr.supplier_product_id = sp.id
WHERE sd.tender_id = %s
ORDER BY s.company_name, sp.id
"""

async def get_supplier_products_by_tender(conn, tender_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_SUPPLIER_PRODUCTS_BY_TENDER, (tender_id,))
        return await cur.fetchall()

_SQL_GET_SUPPLIER_PRODUCTS_BY_SUPPLIER_AND_LOT = """
SELECT sp.id, sp.designation, sp.product_id, sp.supplier_datasheet_id
FROM suppliers_products sp
JOIN supplier_datasheets sd ON sd.id = sp.supplier_datasheet_id
JOIN tenders_products tp ON tp.id = sp.product_id
WHERE sd.tender_id = %s AND sd.supplier_id = %s AND tp.technical_lot_id = %s
"""

async def get_supplier_products_by_supplier_and_lot(conn, tender_id: int, supplier_id: int, technical_lot_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_SUPPLIER_PRODUCTS_BY_SUPPLIER_AND_LOT, (tender_id, supplier_id, technical_lot_id))
        return await cur.fetchall()
        
_SQL_INSERT_SUPPLIER_PRODUCT = """
INSERT INTO suppliers_products (designation, product_id, supplier_datasheet_id)
VALUES (%s, %s, %s)
RETURNING id
"""

async def insert_supplier_product(
    conn,
    designation: str,
    supplier_datasheet_id: int,
    product_id: int | None = None,
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_INSERT_SUPPLIER_PRODUCT,
            (designation, product_id, supplier_datasheet_id),
        )
        row = await cur.fetchone()
        return row[0]


_SQL_UPDATE_SUPPLIER_PRODUCT_FULL = """
UPDATE suppliers_products SET designation = %s, product_id = %s WHERE id = %s
"""

async def update_supplier_product_full(
    conn,
    supplier_product_id: int,
    designation: str,
    product_id: int | None,
) -> None:
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_UPDATE_SUPPLIER_PRODUCT_FULL,
            (designation, product_id, supplier_product_id),
        )


_SQL_UPDATE_SUPPLIER_PRODUCT = "UPDATE suppliers_products SET product_id = %s WHERE id = %s"

async def update_supplier_product(conn, supplier_product_id: int, product_id: int | None) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_UPDATE_SUPPLIER_PRODUCT, (product_id, supplier_product_id))


_SQL_DELETE_SUPPLIER_PRODUCT = "DELETE FROM suppliers_products WHERE id = %s"

async def delete_supplier_product(conn, supplier_product_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_SUPPLIER_PRODUCT, (supplier_product_id,))
        return cur.rowcount > 0