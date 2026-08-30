from psycopg.rows import dict_row


_SQL_DELETE_CANDIDATES_BY_SUPPLIER_PRODUCT = """
DELETE FROM supplier_product_match_candidates WHERE supplier_product_id = %s
"""

async def delete_candidates_by_supplier_product(conn, supplier_product_id: int) -> None:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_CANDIDATES_BY_SUPPLIER_PRODUCT, (supplier_product_id,))


_SQL_INSERT_CANDIDATE = """
INSERT INTO supplier_product_match_candidates
    (supplier_product_id, tender_product_id, score, rank)
VALUES (%s, %s, %s, %s)
"""

async def insert_match_candidates(conn, supplier_product_id: int, candidates: list[dict]) -> None:
    """
    candidates: [{"product_id": ..., "score": ...}, ...] déjà triés du meilleur au moins bon.
    Remplace intégralement les candidats existants pour ce produit (delete + insert),
    plus simple et plus sûr qu'un upsert conditionnel vu que le rank change à chaque recalcul.
    """
    await delete_candidates_by_supplier_product(conn, supplier_product_id)
    async with conn.cursor() as cur:
        for rank, c in enumerate(candidates, start=1):
            await cur.execute(_SQL_INSERT_CANDIDATE, (
                supplier_product_id, c["product_id"], c["score"], rank,
            ))


_SQL_GET_CANDIDATES_BY_SUPPLIER_PRODUCT = """
SELECT
    sp.designation AS supplier_product_designation,
    mc.tender_product_id AS product_id,
    tp.designation,
    mc.score,
    mc.rank
FROM supplier_product_match_candidates mc
JOIN tenders_products tp ON tp.id = mc.tender_product_id
JOIN suppliers_products sp ON sp.id = mc.supplier_product_id
WHERE mc.supplier_product_id = %s
ORDER BY mc.rank
"""

async def get_candidates_by_supplier_product(conn, supplier_product_id: int) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_CANDIDATES_BY_SUPPLIER_PRODUCT, (supplier_product_id,))
        return await cur.fetchall()

_SQL_HAS_CANDIDATES = """
SELECT 1 FROM supplier_product_match_candidates WHERE supplier_product_id = %s LIMIT 1
"""

async def has_candidates(conn, supplier_product_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_HAS_CANDIDATES, (supplier_product_id,))
        return (await cur.fetchone()) is not None