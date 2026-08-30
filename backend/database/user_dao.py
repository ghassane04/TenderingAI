from datetime import datetime
from psycopg.rows import dict_row

_SQL_GET_USER_BY_USERNAME = """
SELECT id, last_name, first_name, email, username, password, roles
FROM agents WHERE username = %s
"""

async def get_user_by_username(conn, username: str) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_USER_BY_USERNAME, (username,))
        return await cur.fetchone()


_SQL_GET_USER_BY_EMAIL = """
SELECT id, last_name, first_name, email, username, password, roles
FROM agents WHERE email = %s
"""

async def get_user_by_email(conn, email: str) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_USER_BY_EMAIL, (email,))
        return await cur.fetchone()


_SQL_GET_USER_BY_ID = """
SELECT id, last_name, first_name, email, username, roles, created_at, updated_at
FROM agents WHERE id = %s
"""

async def get_user_by_id(conn, user_id: int) -> dict | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_GET_USER_BY_ID, (user_id,))
        return await cur.fetchone()


_SQL_LIST_USERS = """
SELECT id, last_name, first_name, email, username, roles, created_at, updated_at
FROM agents ORDER BY last_name, first_name
"""

async def list_users(conn) -> list[dict]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(_SQL_LIST_USERS)
        return await cur.fetchall()


_SQL_INSERT_USER = """
INSERT INTO agents (last_name, first_name, email, username, password, roles)
VALUES (%s, %s, %s, %s, %s, %s)
RETURNING id
"""

async def insert_user(
    conn,
    last_name: str,
    first_name: str,
    email: str,
    username: str,
    hashed_password: str,
    roles: str,
) -> int:
    async with conn.cursor() as cur:
        await cur.execute(
            _SQL_INSERT_USER,
            (last_name, first_name, email, username, hashed_password, roles),
        )
        row = await cur.fetchone()
        return row[0]


async def update_user(
    conn,
    user_id: int,
    last_name: str | None = None,
    first_name: str | None = None,
    email: str | None = None,
    hashed_password: str | None = None,
    roles: str | None = None,
) -> None:
    """Met à jour uniquement les champs fournis (PATCH sémantique)."""
    fields = []
    values = []

    if last_name is not None:
        fields.append("last_name = %s")
        values.append(last_name)
    if first_name is not None:
        fields.append("first_name = %s")
        values.append(first_name)
    if email is not None:
        fields.append("email = %s")
        values.append(email)
    if hashed_password is not None:
        fields.append("password = %s")
        values.append(hashed_password)
    if roles is not None:
        fields.append("roles = %s")
        values.append(roles)

    if not fields:
        return

    fields.append("updated_at = %s")
    values.append(datetime.now())
    values.append(user_id)

    async with conn.cursor() as cur:
        await cur.execute(
            f"UPDATE agents SET {', '.join(fields)} WHERE id = %s",
            tuple(values),
        )


_SQL_DELETE_USER = "DELETE FROM agents WHERE id = %s"

async def delete_user(conn, user_id: int) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_DELETE_USER, (user_id,))
        return cur.rowcount > 0


_SQL_COUNT_ADMINS = """
SELECT COUNT(*) as cnt FROM agents 
WHERE roles ? 'ROLE_ADMIN'
"""

async def count_admins(conn) -> int:
    async with conn.cursor() as cur:
        await cur.execute(_SQL_COUNT_ADMINS)
        row = await cur.fetchone()
        return row[0] if row else 0