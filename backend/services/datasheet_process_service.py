import asyncio
import logging
from datetime import datetime
from pathlib import Path

from database.datasheets_dao import get_datasheet_by_id, update_datasheet_status
from database.supplier_product_dao import insert_supplier_product
from database.characteristics_dao import insert_technical_characteristics
from utils.document_reader import load_document
from utils.splitter import split_document
from llm.client import extract_supplier_products
from services.background import track_task 

logger = logging.getLogger(__name__)

STATUS_EN_ATTENTE = 1
STATUS_EN_COURS = 2
STATUS_TRAITE = 3
STATUS_ERREUR = 4


async def _process_chunk_extract_characteristic(document_text: str) -> list[dict]:
    chunks = await asyncio.to_thread(split_document, document_text)
    logger.info("Nombre de chunks: %d", len(chunks))

    all_products: list[dict] = []
    name_index: dict[str, int] = {}
    last_index: int | None = None

    previous_chunk: str | None = None
    previous_product_name: str | None = None

    for i, chunk in enumerate(chunks):
        try:
            result = await extract_supplier_products(
                chunk=chunk,
                previous_chunk=previous_chunk,
                previous_product_name=previous_product_name,
            )

            for produit in result.produits:
                nom_produit = produit.nom_produit.strip()
                if not nom_produit:
                    continue

                caracteristiques = [
                    {"nom": c.nom.strip(), "valeur": c.valeur.strip()}
                    for c in produit.caracteristiques
                    if c.nom.strip()
                ]
                if not caracteristiques:
                    continue

                if produit.PREVIOUS_PRODUCT == "Oui" and last_index is not None:
                    target_index = last_index
                elif nom_produit.lower() in name_index:
                    target_index = name_index[nom_produit.lower()]
                else:
                    all_products.append({"nom_produit": nom_produit, "caracteristiques": []})
                    target_index = len(all_products) - 1
                    name_index[nom_produit.lower()] = target_index

                existing_caracs = {
                    (c["nom"].lower(), c["valeur"])
                    for c in all_products[target_index]["caracteristiques"]
                }
                for new_carac in caracteristiques:
                    key = (new_carac["nom"].lower(), new_carac["valeur"])
                    if key not in existing_caracs:
                        all_products[target_index]["caracteristiques"].append(new_carac)
                        existing_caracs.add(key)

                last_index = target_index

            if result.produits:
                previous_product_name = result.produits[-1].nom_produit.strip()

        except Exception:
            logger.exception("Erreur sur le chunk %d", i)

        previous_chunk = chunk

    return all_products


async def run_extraction_pipeline(conn, datasheet_id: int) -> int:
    """
    Traite UN document fournisseur identifié explicitement par son id.
    """
    datasheet = await get_datasheet_by_id(conn, datasheet_id)
    if not datasheet:
        raise FileNotFoundError(f"Datasheet {datasheet_id} introuvable.")

    # Le SELECT ci-dessus ouvre une transaction implicite Psycopg. Sans ce
    # commit, les blocs transaction() suivants ne sont que des savepoints et le
    # statut "En cours" reste invisible dans l'interface jusqu'à la fin.
    await conn.commit()

    file_path_str = datasheet["file_path"]
    filename = datasheet["designation"]

    if not file_path_str or not Path(file_path_str).exists():
        async with conn.transaction():
            await update_datasheet_status(conn, datasheet_id, STATUS_ERREUR, datetime.now(), "PIPELINE")
        raise FileNotFoundError(f"Fichier physique introuvable : {file_path_str}")

    async with conn.transaction():
        await update_datasheet_status(conn, datasheet_id, STATUS_EN_COURS, datetime.now(), "PIPELINE")

    try:
        logger.info("[Extraction] Lecture : %s", filename)
        document_text = await load_document(file_path_str)

        if not document_text.strip():
            raise ValueError("Le document est vide ou illisible.")

        logger.info("[Extraction] Extraction des caractéristiques via LLM...")
        produits_extraits = await _process_chunk_extract_characteristic(document_text)

        if not produits_extraits:
            raise ValueError("Aucun produit extrait du document.")

        async with conn.transaction():
            for produit in produits_extraits:
                nom_produit = produit.get("nom_produit", "").strip()
                caracteristiques = produit.get("caracteristiques", [])

                if not nom_produit or not caracteristiques:
                    continue

                supplier_product_id = await insert_supplier_product(
                    conn=conn,
                    designation=nom_produit,
                    supplier_datasheet_id=datasheet_id,
                    product_id=None,
                )

                await insert_technical_characteristics(
                    conn=conn,
                    characteristics=caracteristiques,
                    supplier_product_id=supplier_product_id,
                )

            await update_datasheet_status(conn, datasheet_id, STATUS_TRAITE, datetime.now(), "PIPELINE")

        logger.info("[Extraction] Fiche %s traitée avec succès.", datasheet_id)
        return datasheet_id

    except Exception:
        logger.exception("[Extraction] Échec pour datasheet_id=%s", datasheet_id)
        async with conn.transaction():
            await update_datasheet_status(conn, datasheet_id, STATUS_ERREUR, datetime.now(), "PIPELINE")
        raise


async def _run_extraction_isolated(datasheet_id: int) -> None:
    from database.connection import get_pool
    pool = await get_pool()
    async with pool.connection() as conn:
        await run_extraction_pipeline(conn, datasheet_id)

def launch_extraction_background(datasheet_id: int) -> None:
    """Lance l'extraction en tâche de fond, avec sa propre connexion DB."""
    task = asyncio.create_task(_run_extraction_isolated(datasheet_id))
    track_task(task, f"Extraction datasheet {datasheet_id}")
