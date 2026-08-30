import asyncio
import logging

logger = logging.getLogger(__name__)
_background_tasks: set[asyncio.Task] = set()


def track_task(task: asyncio.Task, label: str) -> None:
    """
    Garde une référence forte à la tâche (empêche le garbage collector de la
    tuer en plein vol) et loggue proprement son issue (succès/erreur/annulation).
    """
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    def _log_result(t: asyncio.Task):
        if t.cancelled():
            logger.warning("%s annulé.", label)
        elif t.exception():
            logger.exception("%s a échoué.", label, exc_info=t.exception())
        else:
            logger.info("%s terminé.", label)

    task.add_done_callback(_log_result)