import logging
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle, KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm

from core.config import G_PDF_DATA_DIR
from database.tender_pdfs_dao import upsert_pdf_record
from services.product_service import service_get_tender_products

logger = logging.getLogger(__name__)


def _format_size(path: Path) -> str:
    try:
        b = path.stat().st_size
        for unit in ["B", "KB", "MB", "GB"]:
            if b < 1024:
                return f"{b:.1f} {unit}"
            b /= 1024
        return f"{b:.1f} GB"
    except OSError:
        return "—"


def _get_output_dir(tender_id: int) -> Path:
    output_dir = Path(G_PDF_DATA_DIR).expanduser().resolve() / str(tender_id) / "lots"
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


# Styles communs

def _styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "LotTitle", parent=base["Heading1"], fontSize=16, leading=20,
            spaceAfter=4, textColor=HexColor("#1e293b"), fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "LotSubtitle", parent=base["Normal"], fontSize=9,
            spaceAfter=16, textColor=HexColor("#64748b"),
        ),
        "product": ParagraphStyle(
            "ProductTitle", parent=base["Heading2"], fontSize=11.5, leading=15,
            spaceBefore=14, spaceAfter=6, textColor=HexColor("#1e293b"), fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "LotBody", parent=base["BodyText"], fontSize=9.5, leading=14,
            alignment=TA_JUSTIFY, spaceAfter=6, textColor=HexColor("#334155"),
        ),
        "cell": ParagraphStyle(
            "CellText", parent=base["BodyText"], fontSize=8.5, leading=11.5,
            textColor=HexColor("#334155"),
        ),
        "cell_header": ParagraphStyle(
            "CellHeader", parent=base["BodyText"], fontSize=8, leading=10,
            textColor=HexColor("#ffffff"), fontName="Helvetica-Bold",
        ),
    }


def _document_header(story: list, st: dict, lot_name: str, tender_id: int) -> None:
    story.append(Paragraph(f"Spécifications Techniques — {lot_name}", st["title"]))
    story.append(Paragraph(
        f"Appel d'offres N° {tender_id} &nbsp;|&nbsp; "
        f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}",
        st["subtitle"],
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#e2e8f0"), spaceAfter=12))


# PDF "lot technique" : tableau structuré Produits / Exigences

def build_requirements_pdf(filename: Path, lot_name: str, tender_id: int, products: list) -> None:
    doc = SimpleDocTemplate(
        str(filename), pagesize=A4,
        rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50,
    )
    st = _styles()
    story: list = []
    _document_header(story, st, lot_name, tender_id)

    if not products:
        story.append(Paragraph("Aucun produit classifié pour ce lot.", st["body"]))
        doc.build(story)
        return

    for product in products:
        block = [Paragraph(product.designation, st["product"])]

        if not product.requirements:
            block.append(Paragraph("Aucune exigence technique renseignée.", st["body"]))
        else:
            rows = [[
                Paragraph("Exigence", st["cell_header"]),
                Paragraph("Opérateur", st["cell_header"]),
                Paragraph("Valeur", st["cell_header"]),
            ]]
            for req in product.requirements:
                rows.append([
                    Paragraph(req.requirement or "—", st["cell"]),
                    Paragraph(req.operateur or "—", st["cell"]),
                    Paragraph(req.value or "—", st["cell"]),
                ])

            table = Table(rows, colWidths=[95 * mm, 30 * mm, 40 * mm], repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), HexColor("#4f46e5")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]))
            block.append(table)

        story.append(KeepTogether(block))
        story.append(Spacer(1, 4))

    doc.build(story)


def _group_products_by_lot(products: list) -> dict[int, dict]:
    """
    Regroupe les produits par lot technique. Les produits sans lot
    (technical_lot_id IS NULL, non classifiés par le LLM) sont exclus ici
    et remontés séparément via _count_unclassified pour avertissement.
    """
    lots: dict[int, dict] = {}
    for p in products:
        if p.technical_lot_id is None:
            continue
        lots.setdefault(p.technical_lot_id, {
            "name": p.technical_lot_name or f"Lot {p.technical_lot_id}",
            "products": [],
        })
        lots[p.technical_lot_id]["products"].append(p)
    return lots


def _count_unclassified(products: list) -> int:
    return sum(1 for p in products if p.technical_lot_id is None)


async def _save_pdf_record(conn, tender_id, lot_id, lot_name, fname, pdf_path, generated_by) -> dict:
    file_size = _format_size(pdf_path)
    await upsert_pdf_record(
        conn=conn, tender_id=tender_id, technical_lot_id=lot_id,
        lot_name=lot_name, filename=fname, file_path=str(pdf_path),
        file_size=file_size, generated_by=generated_by,
    )
    return {
        "lot_id": lot_id, "lot_name": lot_name, "filename": fname,
        "file_path": str(pdf_path), "file_size": file_size, "exists": pdf_path.exists(),
    }


# Points d'entrée publics

async def generate_tender_lots_pdfs(conn, tender_id: int, generated_by: str = "SYSTEM") -> dict:
    """
    Génère un PDF tableau par lot technique classifié.
    Retourne { "pdfs": [...], "warnings": [...] }.
    """
    output_dir = _get_output_dir(tender_id)
    generated: list[dict] = []
    warnings: list[str] = []

    products = await service_get_tender_products(conn, tender_id)
    lots_data = _group_products_by_lot(products)

    if not lots_data:
        raise ValueError(f"Aucun produit classifié dans un lot technique pour le Tender {tender_id}.")

    unclassified = _count_unclassified(products)
    if unclassified:
        warnings.append(
            f"{unclassified} produit(s) non classifié(s) exclu(s) du PDF — "
            f"assignez-leur un lot technique manuellement depuis leur fiche."
        )

    for lot_id, info in lots_data.items():
        fname = f"lot_{lot_id}.pdf"
        pdf_path = output_dir / fname
        logger.info("[PDF] Génération : %s", fname)
        build_requirements_pdf(pdf_path, info["name"], tender_id, info["products"])
        generated.append(
            await _save_pdf_record(conn, tender_id, lot_id, info["name"], fname, pdf_path, generated_by)
        )

    logger.info("[PDF] %d PDF(s) générés pour Tender %d.", len(generated), tender_id)
    return {"pdfs": generated, "warnings": warnings}


async def generate_single_lot_pdf(conn, tender_id: int, technical_lot_id: int, generated_by: str = "SYSTEM") -> dict:
    """Régénère uniquement le PDF d'un lot technique."""
    output_dir = _get_output_dir(tender_id)

    products = await service_get_tender_products(conn, tender_id)
    lot_products = [p for p in products if p.technical_lot_id == technical_lot_id]
    if not lot_products:
        raise ValueError(f"Aucun produit classifié pour le lot {technical_lot_id} du Tender {tender_id}.")

    lot_name = lot_products[0].technical_lot_name or f"Lot {technical_lot_id}"
    fname = f"lot_{technical_lot_id}.pdf"
    pdf_path = output_dir / fname
    build_requirements_pdf(pdf_path, lot_name, tender_id, lot_products)
    return await _save_pdf_record(conn, tender_id, technical_lot_id, lot_name, fname, pdf_path, generated_by)