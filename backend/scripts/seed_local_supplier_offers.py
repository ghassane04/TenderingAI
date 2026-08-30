"""Charge des offres fournisseurs locales dans le flux métier de l'application.

Ce script remplace uniquement l'étape IMAP lorsque la messagerie n'est pas
configurée. Il est idempotent : les mêmes fournisseurs, affectations et fiches
ne sont pas dupliqués lors d'une nouvelle exécution.
"""

import shutil
from datetime import datetime
from pathlib import Path

import psycopg

from core.config import BASE_DIR, PG_DATABASE, PG_HOST, PG_PASSWORD, PG_PORT, PG_USER, R_DATA_DIR


OFFERS = (
    {
        "tender_code": "N° 28/2026",
        "supplier": "Atlas IT Solutions",
        "filename": "Offre_Atlas_IT_AO_28_2026.pdf",
        "lots": ("Postes de travail & périphériques", "Impression & numérisation"),
    },
    {
        "tender_code": "N° 28/2026",
        "supplier": "Rif Systems",
        "filename": "Offre_Rif_Systems_AO_28_2026.pdf",
        "lots": ("Postes de travail & périphériques", "Impression & numérisation"),
    },
    {
        "tender_code": "05/DAAF/BG/2026",
        "supplier": "Culture Tech",
        "filename": "Offre_Culture_Tech_AO_05_2026.pdf",
        "lots": (
            "Postes de travail & périphériques",
            "Impression & numérisation",
            "Réseaux & cybersécurité",
        ),
    },
)


def file_size(path: Path) -> str:
    size = float(path.stat().st_size)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def main() -> None:
    conninfo = (
        f"host={PG_HOST} port={PG_PORT} user={PG_USER} "
        f"password={PG_PASSWORD} dbname={PG_DATABASE}"
    )
    output_dir = BASE_DIR / "output" / "pdf"
    now = datetime.now()

    with psycopg.connect(conninfo) as conn:
        with conn.cursor() as cur:
            for offer in OFFERS:
                source = output_dir / offer["filename"]
                if not source.is_file():
                    raise FileNotFoundError(source)

                cur.execute("SELECT id FROM tenders WHERE code = %s", (offer["tender_code"],))
                tender_row = cur.fetchone()
                cur.execute("SELECT id FROM suppliers WHERE company_name = %s", (offer["supplier"],))
                supplier_row = cur.fetchone()
                if not tender_row or not supplier_row:
                    raise RuntimeError(f"Tender ou fournisseur introuvable pour {offer['filename']}")

                tender_id, supplier_id = tender_row[0], supplier_row[0]
                destination_dir = Path(R_DATA_DIR) / "local" / str(tender_id) / str(supplier_id)
                destination_dir.mkdir(parents=True, exist_ok=True)
                destination = destination_dir / source.name
                shutil.copy2(source, destination)

                lot_ids: list[int] = []
                for lot_name in offer["lots"]:
                    cur.execute("SELECT id FROM technical_lot WHERE name = %s", (lot_name,))
                    lot_row = cur.fetchone()
                    if not lot_row:
                        raise RuntimeError(f"Lot technique introuvable : {lot_name}")
                    lot_id = lot_row[0]
                    lot_ids.append(lot_id)
                    cur.execute(
                        """
                        INSERT INTO tender_supplier_lots
                            (tender_id, supplier_id, technical_lot_id, status_id, created_at)
                        VALUES (%s, %s, %s, 3, %s)
                        ON CONFLICT (tender_id, supplier_id, technical_lot_id)
                        DO UPDATE SET status_id = EXCLUDED.status_id
                        """,
                        (tender_id, supplier_id, lot_id, now),
                    )

                cur.execute(
                    """
                    SELECT id FROM supplier_datasheets
                    WHERE tender_id = %s AND supplier_id = %s AND designation = %s
                    """,
                    (tender_id, supplier_id, source.name),
                )
                existing = cur.fetchone()
                primary_lot_id = lot_ids[0] if lot_ids else None
                if existing:
                    datasheet_id = existing[0]
                    cur.execute(
                        """
                        UPDATE supplier_datasheets
                        SET file_path = %s, file_size = %s, technical_lot_id = %s,
                            filetype_id = 1, supplier_datasheet_status_id = 1,
                            updated_at = %s, updated_by = 'LOCAL_IMPORT'
                        WHERE id = %s
                        """,
                        (str(destination), file_size(destination), primary_lot_id, now, datasheet_id),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO supplier_datasheets (
                            designation, file_path, file_size, supplier_id,
                            technical_lot_id, tender_id, filetype_id,
                            supplier_datasheet_status_id, uploaded_at, uploaded_by
                        ) VALUES (%s, %s, %s, %s, %s, %s, 1, 1, %s, 'LOCAL_IMPORT')
                        RETURNING id
                        """,
                        (
                            source.name,
                            str(destination),
                            file_size(destination),
                            supplier_id,
                            primary_lot_id,
                            tender_id,
                            now,
                        ),
                    )
                    datasheet_id = cur.fetchone()[0]

                print(f"datasheet={datasheet_id} tender={tender_id} supplier={offer['supplier']}")


if __name__ == "__main__":
    main()
