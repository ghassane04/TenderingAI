import asyncio
import logging
from datetime import datetime

from database.blacklist_dao import purge_expired_blacklist
from database.connection import get_pool

logger = logging.getLogger(__name__)


async def purge_blacklist_job(hours: int = 8):
    """
    Job de purge de la blacklist.
    Supprime les tokens blacklistés plus vieux que 'hours' heures.
    """
    try:
        pool = await get_pool()
        async with pool.connection() as conn:
            async with conn.transaction():
                deleted = await purge_expired_blacklist(conn, hours)
                if deleted > 0:
                    logger.info("[Purge Blacklist] %d tokens supprimés (plus vieux que %dh)", deleted, hours)
    except Exception as e:
        logger.error("[Purge Blacklist] Erreur : %s", e)


async def start_blacklist_purge_scheduler(interval_hours: int = 24, retention_hours: int = 8):
    """
    Démarre un scheduler qui purge la blacklist toutes les 'interval_hours' heures.
    À appeler dans le lifespan de l'application.
    """
    while True:
        await purge_blacklist_job(retention_hours)
        await asyncio.sleep(interval_hours * 3600)