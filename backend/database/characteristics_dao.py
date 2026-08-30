from psycopg.rows import dict_row

_SQL_GET_CHARACTERISTIC_BY_ID = """
SELECT id, technical_data, value, evaluation, supplier_product_id, requirement_id
FROM suppliers_products_technical_caracteristic
WHERE id = %s
"""

async def get_characteristic_by_id(conn, characteristic_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_CHARACTERISTIC_BY_ID, (characteristic_id,))
        return await cur.fetchone()


_SQL_GET_TECHNICAL_CHARACTERISTICS_BY_SUPPLIER_PRODUCT = """
SELECT
    sptc.id,
    sptc.technical_data,
    sptc.value,
    sptc.supplier_product_id,
    sptc.requirement_id,
    sptc.evaluation,
    sc.designation AS evaluation_label,
    sc.description  AS evaluation_description
FROM suppliers_products_technical_caracteristic sptc
LEFT JOIN score_conformite sc ON sc.id = sptc.evaluation
WHERE sptc.supplier_product_id = %s
ORDER BY sptc.id ASC
"""

async def get_technical_characteristics_by_supplier_product(
    conn,
    supplier_product_id: int,
) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            _SQL_GET_TECHNICAL_CHARACTERISTICS_BY_SUPPLIER_PRODUCT,
            (supplier_product_id,),
        )
        return await cur.fetchall()


_SQL_INSERT_TECHNICAL_CHARACTERISTIC = """
INSERT INTO suppliers_products_technical_caracteristic (
    technical_data,
    value,
    evaluation,
    supplier_product_id,
    requirement_id
) VALUES (%s, %s, %s, %s, %s)
RETURNING id
"""

async def insert_technical_characteristics(
    conn,
    characteristics: list[dict],
    supplier_product_id: int,
) -> list[int]:
    """Insère plusieurs caractéristiques techniques en batch."""
    ids = []
    async with conn.cursor() as cur:
        for char in characteristics:
            await cur.execute(
                _SQL_INSERT_TECHNICAL_CHARACTERISTIC,
                (
                    char.get("nom", ""),
                    char.get("valeur", ""),
                    None,   # evaluation → mis à jour après /compare
                    supplier_product_id,
                    None,   # requirement_id → mis à jour après /compare
                ),
            )
            row = await cur.fetchone()
            ids.append(row[0])
    return ids


async def insert_technical_characteristic(
    conn,
    technical_data: str,
    value: str,
    supplier_product_id: int,
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_INSERT_TECHNICAL_CHARACTERISTIC,
            (
                technical_data,
                value,
                None,   # evaluation → mis à jour après /compare
                supplier_product_id,
                None,   # requirement_id → mis à jour après /compare
            ),
        )
        row = await cur.fetchone()
        return row[0]


_SQL_UPDATE_CHARACTERISTIC_DATA = """
UPDATE suppliers_products_technical_caracteristic
SET technical_data = %s, value = %s, requirement_id = %s
WHERE id = %s
"""

async def update_characteristic_data(
    conn,
    characteristic_id: int,
    technical_data: str,
    value: str,
    requirement_id: int | None = None,
) -> None:
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_UPDATE_CHARACTERISTIC_DATA,
            (technical_data, value, requirement_id, characteristic_id),
        )


_SQL_UPDATE_TECHNICAL_EVALUATION = """
UPDATE suppliers_products_technical_caracteristic
SET evaluation = %s, requirement_id = %s
WHERE id = %s
"""

_SQL_GET_EVALUATION_LABEL = """
SELECT sc.designation, sc.description
FROM score_conformite sc
WHERE sc.id = %s
"""

async def update_technical_characteristic_evaluation(
    conn,
    characteristic_id: int,
    evaluation: int,
    requirement_id: int | None = None,
) -> dict:
    """Met à jour l'évaluation d'une caractéristique technique."""
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_UPDATE_TECHNICAL_EVALUATION,
            (evaluation, requirement_id, characteristic_id),
        )

        # Récupère le libellé correspondant pour log/debug
        await cur.execute(_SQL_GET_EVALUATION_LABEL, (evaluation,))
        row = await cur.fetchone()
        return {"designation": row[0], "description": row[1]} if row else {"designation": None, "description": None}


_SQL_RESET_TECHNICAL_EVALUATIONS = """
UPDATE suppliers_products_technical_caracteristic
SET evaluation = NULL, requirement_id = NULL
WHERE supplier_product_id = %s
"""


async def reset_technical_characteristic_evaluations(
    conn,
    supplier_product_id: int,
) -> None:
    """Supprime les associations d'une comparaison précédente avant recalcul."""
    async with conn.cursor() as cur:
        await cur.execute(_SQL_RESET_TECHNICAL_EVALUATIONS, (supplier_product_id,))


_SQL_DELETE_CHARACTERISTIC = """
DELETE FROM suppliers_products_technical_caracteristic WHERE id = %s
"""

async def delete_characteristic(conn, characteristic_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_CHARACTERISTIC, (characteristic_id,))
        return cur.rowcount > 0
