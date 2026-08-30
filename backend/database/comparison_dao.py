from psycopg.rows import dict_row
from datetime import datetime

_SQL_UPSERT_COMPARISON_RESULT = """
INSERT INTO supplier_product_comparison_results
    (supplier_product_id, product_id, score, computed_at, computed_by)
VALUES (%s, %s, %s, %s, %s)
ON CONFLICT (supplier_product_id) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    score = EXCLUDED.score,
    computed_at = EXCLUDED.computed_at,
    computed_by = EXCLUDED.computed_by
"""

async def upsert_comparison_result(
    conn, supplier_product_id: int, product_id: int, score: float, computed_by: str,
) -> None:
    from datetime import datetime
    async with conn.cursor() as cur:
        await cur.execute(_SQL_UPSERT_COMPARISON_RESULT, (
            supplier_product_id, product_id, score, datetime.now(), computed_by,
        ))


_SQL_GET_COMPARISON_RESULT = """
SELECT score FROM supplier_product_comparison_results WHERE supplier_product_id = %s
"""

async def get_comparison_result(conn, supplier_product_id: int) -> dict | None:
    from psycopg.rows import dict_row
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_COMPARISON_RESULT, (supplier_product_id,))
        return await cur.fetchone()