import asyncio
import logging
import smtplib
import secrets
from datetime import datetime
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

from core.config import SMTP_SERVER, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD
from database.tender_supplier_lots_dao import get_lot_by_id, update_tsl_status
from database.tender_pdfs_dao import get_pdf_by_tender_and_lot
from database.tender_supplier_lot_emails_dao import insert_email_log
from database.document_dao import get_documents_by_tender
from schemas.email_schema import EmailPreview

logger = logging.getLogger(__name__)

TSL_STATUS_ENVOYE = 2
TSL_STATUS_REPONSE = 3
TSL_STATUS_ERREUR_ENVOI = 4


def generate_unique_token() -> str:
    return secrets.token_hex(4)


def build_email_preview(row: dict) -> EmailPreview:
    code = row.get("tender_code") or f"AO-{row['tender_id']}"
    designation = row.get("tender_designation") or "objet non renseigné"
    client = row.get("tender_client")

    subject = f"Consultation AO N°{code} - Lot: {row['lot_name']}"

    client_line = f" pour le compte de {client}" if client else ""

    body = f"""Bonjour l'équipe {row['supplier_name']},

Dans le cadre de l'Appel d'offres N°{code}{client_line}, ayant pour objet {designation},
veuillez trouver ci-joint le document original de l'appel d'offres ainsi que les spécifications techniques concernant le lot suivant :
{row['lot_name']}.

Merci de nous faire parvenir votre meilleure proposition commerciale et technique en répondant
directement à cet email.

Cordialement,
Direction des Achats
"""
    return EmailPreview(subject=subject, body=body)


def _send_email_with_attachments_sync(
    supplier_email: str, subject: str, body: str, attachments: list[Path], token: str,
) -> str:
    email_parts = SMTP_EMAIL.split('@')
    dynamic_reply_to = f"{email_parts[0]}+{token}@{email_parts[1]}"

    msg = MIMEMultipart()
    msg['From'] = SMTP_EMAIL
    msg['To'] = supplier_email
    msg['Reply-To'] = dynamic_reply_to
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))

    for path in attachments:
        if not path.exists():
            logger.warning("Pièce jointe introuvable, ignorée : %s", path)
            continue
        with open(path, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f"attachment; filename={path.name}")
            msg.attach(part)

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, supplier_email, msg.as_string())
        message_id = msg['Message-ID'] if msg['Message-ID'] else f"<{secrets.token_hex(12)}@local.engine>"

    return message_id


async def send_email_with_attachments(
    supplier_email: str, subject: str, body: str, attachments: list[Path], token: str,
) -> str:
    """Wrapper async : délègue l'envoi SMTP bloquant à un thread séparé."""
    return await asyncio.to_thread(
        _send_email_with_attachments_sync, supplier_email, subject, body, attachments, token,
    )


async def _get_tender_original_attachments(conn, tender_id: int) -> list[Path]:

    documents = await get_documents_by_tender(conn, tender_id)
    attachments = []
    for doc in documents:
        if not doc.get("path"):
            continue
        path = Path(doc["path"])
        if path.exists():
            attachments.append(path)
        else:
            logger.warning("Document original introuvable sur disque, ignoré : %s", path)
    return attachments


async def send_single_email(
    conn, tsl_id: int, subject: str, body: str, generated_by: str = "SYSTEM",
) -> dict:
    row = await get_lot_by_id(conn, tsl_id)
    if not row:
        raise ValueError("Association fournisseur/lot introuvable")
    if row.get("status_id") == TSL_STATUS_REPONSE:
        raise ValueError("Ce fournisseur a déjà répondu — l'envoi est bloqué pour éviter toute confusion.")
    if not row.get("supplier_email"):
        raise ValueError("Aucune adresse email renseignée pour ce fournisseur.")

    tender_id = row["tender_id"]
    lot_id = row["technical_lot_id"]

    # PDF technique du lot (produits + exigences), généré à partir des
    # données structurées en base — reste fiable par construction.
    lot_pdf = await get_pdf_by_tender_and_lot(conn, tender_id, lot_id)
    if not lot_pdf or not Path(lot_pdf["file_path"]).exists():
        raise ValueError("Le PDF de ce lot n'a pas encore été généré.")

    attachments = [Path(lot_pdf["file_path"])]

    # Document(s) original(aux) du tender, à la place de l'ancien PDF admin reconstruit.
    original_attachments = await _get_tender_original_attachments(conn, tender_id)
    if not original_attachments:
        logger.warning(
            "Aucun document original disponible pour le Tender %s — envoi du PDF technique seul.",
            tender_id,
        )
    attachments.extend(original_attachments)

    token = generate_unique_token()

    # Le token est ajouté ici (sujet + corps) car il n'est généré qu'au moment
    # de l'envoi réel — impossible de le montrer à l'utilisateur pendant l'édition.
    full_subject = f"{subject} [Réf: {token}]"
    full_body = (
        f"{body}\n\n---\n"
        f"Veuillez ne pas modifier l'adresse de réponse ni la ligne ci-dessous :\n"
        f"Référence dossier de suivi : {token}\n"
    )

    try:
        message_id = await send_email_with_attachments(
            supplier_email=row["supplier_email"], subject=full_subject, body=full_body,
            attachments=attachments, token=token,
        )

        async with conn.transaction():
            await update_tsl_status(conn, tsl_id, status_id=TSL_STATUS_ENVOYE)
            await insert_email_log(
                conn, tsl_id=tsl_id, tender_id=tender_id, supplier_id=row["supplier_id"],
                technical_lot_id=lot_id, direction="outbound", subject=full_subject, body_envoi=full_body,
                tracking_token=token, message_id=message_id,
                from_address=SMTP_EMAIL, to_address=row["supplier_email"],
                sent_at=datetime.now(), status_id=TSL_STATUS_ENVOYE,
            )

        return {"success": True, "message": f"Email envoyé à {row['supplier_name']}."}

    except Exception as e:
        logger.exception("Échec de l'envoi d'email pour tsl_id=%s", tsl_id)
        async with conn.transaction():
            await update_tsl_status(conn, tsl_id, status_id=TSL_STATUS_ERREUR_ENVOI)
            await insert_email_log(
                conn, tsl_id=tsl_id, tender_id=tender_id, supplier_id=row["supplier_id"],
                technical_lot_id=lot_id, direction="outbound", subject=full_subject, body_envoi=full_body,
                tracking_token=token, from_address=SMTP_EMAIL, to_address=row["supplier_email"],
                sent_at=datetime.now(), status_id=TSL_STATUS_ERREUR_ENVOI, error_message=str(e),
            )
        raise