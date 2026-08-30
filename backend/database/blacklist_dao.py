from datetime import datetime, timedelta

_SQL_INSERT_BLACKLIST = """
INSERT INTO jwt_blacklist (token_jti, blacklisted_at) 
VALUES (%s, %s)
ON CONFLICT (token_jti) DO NOTHING
"""

async def blacklist_token(conn, jti: str) -> None:
    """Ajoute un token à la blacklist."""
    async with conn.cursor() as cur:
        await cur.execute(_SQL_INSERT_BLACKLIST, (jti, datetime.now()))


_SQL_IS_BLACKLISTED = "SELECT id FROM jwt_blacklist WHERE token_jti = %s"

async def is_token_blacklisted(conn, jti: str) -> bool:
    """Vérifie si un token est blacklisté."""
    async with conn.cursor() as cur:
        await cur.execute(_SQL_IS_BLACKLISTED, (jti,))
        row = await cur.fetchone()
        return row is not None


_SQL_PURGE_BLACKLIST = """
DELETE FROM jwt_blacklist 
WHERE blacklisted_at < %s
"""

async def purge_expired_blacklist(conn, hours: int = 8) -> int:
    """
    Supprime les tokens blacklistés plus vieux que 'hours' heures.
    Retourne le nombre de lignes supprimées.
    """
    cutoff = datetime.now() - timedelta(hours=hours)
    async with conn.cursor() as cur:
        await cur.execute(_SQL_PURGE_BLACKLIST, (cutoff,))
        return cur.rowcount