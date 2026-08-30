import asyncio
import imaplib
import email
import logging
import re
from pathlib import Path
from datetime import datetime, timedelta
from email.header import decode_header

from database.datasheets_dao import insert_datasheet, get_datasheet_by_tender_supplier_and_name
from database.tender_supplier_lots_dao import get_lot_by_id, update_tsl_status
from database.tender_supplier_lot_emails_dao import (
    insert_email_log, get_email_log_by_token, get_email_log_by_message_id,
)
from schemas.email_schema import EmailCheckRange
from core.config import IMAP_SERVER, IMAP_PORT, IMAP_EMAIL, IMAP_PASSWORD, R_DATA_DIR
from utils.safe_filename import sanitize_filename, unique_storage_name
from utils.email_cleaner import strip_quoted_reply

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".txt"}
EXTENSION_TO_FILETYPE_ID = {
    ".pdf": 1, ".docx": 2, ".doc": 2,
    ".xlsx": 3, ".xls": 3, ".txt": 4,
}

MAX_EMAILS_PER_CHECK = 50

TSL_STATUS_REPONSE_ATTENDUE = 2
TSL_STATUS_REPONSE_RECUE = 3
TSL_STATUS_ERREUR_RECEPTION = 5

_RANGE_TO_DAYS = {
    EmailCheckRange.TODAY: 0,
    EmailCheckRange.LAST_2_DAYS: 1,
    EmailCheckRange.LAST_7_DAYS: 6,
    EmailCheckRange.ALL_UNSEEN: None,
}


def get_file_size_bytes(file_path: Path) -> int:
    try:
        return file_path.stat().st_size
    except (OSError, FileNotFoundError):
        return 0


def format_file_size(size_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} PB"


def validate_attachment(filename: str, file_bytes: bytes) -> tuple[str, int]:
    if not filename or not filename.strip():
        raise ValueError("Nom de fichier vide")
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Extension '{ext}' non supportée. Acceptées : {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )
    if not file_bytes:
        raise ValueError(f"Fichier '{filename}' vide")
    return ext, EXTENSION_TO_FILETYPE_ID[ext]


def clean_header(value: str) -> str:
    if not value:
        return ""
    decoded, encoding = decode_header(value)[0]
    if isinstance(decoded, bytes):
        return decoded.decode(encoding or "utf-8", errors="ignore")
    return str(decoded)


def extract_body_text(msg) -> str:
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body += payload.decode("utf-8", errors="ignore")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode("utf-8", errors="ignore")
    return body


def extract_token_from_text(text: str) -> str | None:
    match = re.search(r"Référence dossier de suivi\s*:\s*([a-f0-9]{8})", text, re.IGNORECASE)
    return match.group(1) if match else None


def _context_from_log(log: dict | None) -> dict | None:
    if not log or not log.get("tsl_id"):
        return None
    return {
        "tsl_id": log["tsl_id"], "tender_id": log["tender_id"],
        "technical_lot_id": log["technical_lot_id"], "supplier_id": log["supplier_id"],
    }


async def resolve_email_context(conn, msg, body_text: str) -> dict | None:
    to_addr = clean_header(msg.get("To", ""))
    m = re.search(r"\+([a-f0-9]{8})@", to_addr)
    if m:
        ctx = _context_from_log(await get_email_log_by_token(conn, m.group(1)))
        if ctx:
            return ctx

    in_reply = clean_header(msg.get("In-Reply-To", ""))
    if in_reply:
        ctx = _context_from_log(await get_email_log_by_message_id(conn, in_reply.strip()))
        if ctx:
            return ctx

    token = extract_token_from_text(body_text)
    if token:
        ctx = _context_from_log(await get_email_log_by_token(conn, token))
        if ctx:
            return ctx

    return None


def _build_search_criteria(date_range: EmailCheckRange) -> str:
    days = _RANGE_TO_DAYS.get(date_range)
    if days is None:
        return "UNSEEN"
    since_date = (datetime.now() - timedelta(days=days)).strftime("%d-%b-%Y")
    return f'(UNSEEN SINCE "{since_date}")'


# --- Bloc IMAP bloquant, exécuté via asyncio.to_thread ---

def _imap_connect(date_range: EmailCheckRange):
    mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
    mail.login(IMAP_EMAIL, IMAP_PASSWORD)
    mail.select("inbox")
    criteria = _build_search_criteria(date_range)
    status, messages = mail.search(None, criteria)
    if status != "OK" or not messages[0]:
        return mail, []
    return mail, messages[0].split()


def _imap_fetch(mail, e_id) -> bytes | None:
    status, data = mail.fetch(e_id, "(RFC822)")
    if status != "OK":
        return None
    return data[0][1]


def _imap_mark_seen(mail, e_id) -> None:
    mail.store(e_id, "+FLAGS", "\\Seen")


def _imap_close(mail) -> None:
    try:
        mail.close()
        mail.logout()
    except Exception:
        pass


async def check_inbound_emails(conn, date_range: EmailCheckRange = EmailCheckRange.LAST_2_DAYS) -> int:
    try:
        mail, message_ids = await asyncio.to_thread(_imap_connect, date_range)
    except Exception:
        logger.exception("Connexion IMAP échouée")
        return 0

    if not message_ids:
        await asyncio.to_thread(_imap_close, mail)
        return 0

    if len(message_ids) > MAX_EMAILS_PER_CHECK:
        logger.info(
            "%d email(s) trouvés, traitement limité aux %d plus récents.",
            len(message_ids), MAX_EMAILS_PER_CHECK,
        )
        message_ids = message_ids[-MAX_EMAILS_PER_CHECK:]

    inserted_count = 0

    for e_id in message_ids:
        tsl_id = None
        try:
            raw = await asyncio.to_thread(_imap_fetch, mail, e_id)
            if raw is None:
                continue

            msg = email.message_from_bytes(raw)
            raw_body_text = extract_body_text(msg)
            body_text = strip_quoted_reply(raw_body_text)
            from_addr = clean_header(msg.get("From", ""))
            message_id_header = clean_header(msg.get("Message-ID", ""))
            in_reply_to_header = clean_header(msg.get("In-Reply-To", ""))

            context = await resolve_email_context(conn, msg, raw_body_text)
            if not context:
                logger.info("Email %s : contexte non résolu, laissé non lu.", e_id)
                continue

            tender_id = context["tender_id"]
            lot_id = context["technical_lot_id"]
            tsl_id = context["tsl_id"]
            supplier_id = context["supplier_id"]

            current = await get_lot_by_id(conn, tsl_id)
            if not current or current["status_id"] != TSL_STATUS_REPONSE_ATTENDUE:
                logger.info("TSL %s statut=%s, réponse ignorée.", tsl_id, current["status_id"] if current else "?")
                await asyncio.to_thread(_imap_mark_seen, mail, e_id)
                continue

            has_valid_attachment = False
            newly_inserted_in_this_email = 0

            for part in msg.walk():
                if part.get_content_maintype() == "multipart" or part.get("Content-Disposition") is None:
                    continue

                raw_filename = clean_header(part.get_filename() or "")
                file_bytes = part.get_payload(decode=True)

                try:
                    ext, filetype_id = validate_attachment(raw_filename, file_bytes)
                except ValueError as ve:
                    logger.info("Pièce jointe ignorée (%s) : %s", raw_filename, ve)
                    continue

                designation = sanitize_filename(raw_filename)

                existing = await get_datasheet_by_tender_supplier_and_name(
                    conn, tender_id, supplier_id, designation,
                )
                if existing:
                    logger.info(
                        "Fichier '%s' déjà reçu de ce fournisseur pour ce tender (datasheet_id=%s), ignoré.",
                        designation, existing["id"],
                    )
                    has_valid_attachment = True
                    continue

                save_dir = Path(R_DATA_DIR).expanduser().resolve() / str(tender_id) / "responses" / f"lot_{lot_id}"
                save_dir.mkdir(parents=True, exist_ok=True)
                filepath = save_dir / unique_storage_name(raw_filename)

                filepath.write_bytes(file_bytes)
                file_size = format_file_size(get_file_size_bytes(filepath))

                await insert_datasheet(
                    conn=conn, designation=designation, file_path=str(filepath),
                    uploaded_at=datetime.now(), uploaded_by="SYSTEM_IMAP",
                    supplier_id=supplier_id, tender_id=tender_id, technical_lot_id=lot_id,
                    filetype_id=filetype_id, file_size=file_size, status_id=1,
                )
                has_valid_attachment = True
                newly_inserted_in_this_email += 1

            # Un seul commit logique pour tout l'email, pas par pièce jointe.
            final_status = TSL_STATUS_REPONSE_RECUE if has_valid_attachment else TSL_STATUS_ERREUR_RECEPTION
            async with conn.transaction():
                await update_tsl_status(conn, tsl_id, status_id=final_status)
                await insert_email_log(
                    conn, tsl_id=tsl_id, tender_id=tender_id, supplier_id=supplier_id,
                    technical_lot_id=lot_id, direction="inbound", from_address=from_addr,
                    body_recu=body_text,
                    message_id=message_id_header or None, in_reply_to=in_reply_to_header or None,
                    received_at=datetime.now(), status_id=final_status,
                    error_message=None if has_valid_attachment else "Aucune pièce jointe valide",
                )

            inserted_count += newly_inserted_in_this_email
            if not has_valid_attachment:
                logger.info("Email %s sans pièce jointe valide.", e_id)

            await asyncio.to_thread(_imap_mark_seen, mail, e_id)

        except Exception:
            logger.exception("Erreur email %s", e_id)
            if tsl_id is not None:
                try:
                    async with conn.transaction():
                        await update_tsl_status(conn, tsl_id, status_id=TSL_STATUS_ERREUR_RECEPTION)
                except Exception:
                    logger.exception("Impossible de marquer TSL %s en erreur", tsl_id)
            await asyncio.to_thread(_imap_mark_seen, mail, e_id)

    await asyncio.to_thread(_imap_close, mail)
    return inserted_count