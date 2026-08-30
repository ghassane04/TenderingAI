import asyncio
import logging
import os
from pathlib import Path

import pytesseract
from pdf2image import convert_from_path
from PIL import Image
from core.config import OCR_MAX_WORKERS

logger = logging.getLogger(__name__)

TESSERACT_LANG = "fra+ara+eng"
OCR_DPI = 300

def _preprocess_image(image: Image.Image) -> Image.Image:
    return image.convert("L")


def _ocr_single_page_sync(image: Image.Image, page_number: int) -> str:
    """Fonction bloquante — traite UNE page. Appelée via to_thread."""
    try:
        processed = _preprocess_image(image)
        return pytesseract.image_to_string(processed, lang=TESSERACT_LANG).strip()
    except Exception:
        logger.exception("Échec OCR page %d", page_number)
        return ""


def ocr_image(path: str | Path) -> str:
    """OCR d'une image isolée. Fonction synchrone — appeler via asyncio.to_thread()."""
    path = Path(path)
    logger.info("[Tesseract OCR] Traitement de l'image : %s", path.name)
    try:
        image = Image.open(path)
        return _ocr_single_page_sync(image, page_number=1)
    except Exception:
        logger.exception("Erreur lors de l'OCR image : %s", path.name)
        return ""


async def ocr_pdf(path: str | Path, max_pages: int | None = None) -> str:
    path = Path(path)
    logger.info("[Tesseract OCR] Traitement du PDF scanné : %s (max_pages=%s)", path.name, max_pages)

    try:
        images = await asyncio.to_thread(
            convert_from_path, str(path), dpi=OCR_DPI, last_page=max_pages,
        )
    except Exception:
        logger.exception("Échec du rendu PDF->image pour l'OCR : %s", path.name)
        return ""

    semaphore = asyncio.Semaphore(OCR_MAX_WORKERS)

    async def _process(image: Image.Image, page_number: int) -> str:
        async with semaphore:
            return await asyncio.to_thread(_ocr_single_page_sync, image, page_number)

    results = await asyncio.gather(
        *(_process(img, i + 1) for i, img in enumerate(images))
    )

    return "\n".join(t for t in results if t)