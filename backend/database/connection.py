import logging
import sys
import asyncio

import psycopg
from psycopg_pool import AsyncConnectionPool

from core.config import PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE

logger = logging.getLogger(__name__)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

_pool: AsyncConnectionPool | None = None


def _build_conninfo() -> str:
    return (
        f"host={PG_HOST} port={PG_PORT} user={PG_USER} "
        f"password={PG_PASSWORD} dbname={PG_DATABASE}"
    )


async def get_pool() -> AsyncConnectionPool:
    global _pool
    if _pool is None:
        raise RuntimeError(
            "Le pool Postgres n'a pas été initialisé. Appeler init_pool() au démarrage de l'application."
        )
    return _pool


async def init_pool(min_size: int = 1, max_size: int = 10) -> AsyncConnectionPool:
    global _pool
    if _pool is not None:
        return _pool

    logger.info("Initializing PostgreSQL connection pool (min=%d, max=%d)", min_size, max_size)
    try:
        _pool = AsyncConnectionPool(
            conninfo=_build_conninfo(),
            min_size=min_size,
            max_size=max_size,
            open=False,
        )
        await _pool.open(wait=True, timeout=10)
    except psycopg.OperationalError as exc:
        logger.exception("Failed to connect to PostgreSQL")
        raise RuntimeError(f"PostgreSQL connection failed: {exc}") from exc

    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL connection pool closed")