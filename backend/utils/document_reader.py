from pathlib import Path
import asyncio

import docx
import pandas as pd
import pdfplumber

from utils.ocr import ocr_pdf, ocr_image

def read_pdf(path: str | Path, max_pages: int | None = None) -> str:
    text_list: list[str] = []

    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages):
            if max_pages is not None and i >= max_pages:
                break
            page_text = page.extract_text()
            if page_text:
                text_list.append(page_text)

    return "\n".join(text_list)

def is_pdf_scanned(path: str | Path, max_pages: int | None = None) -> bool:
    probe_pages = max_pages if max_pages is not None else 3
    text = read_pdf(path, max_pages=probe_pages)
    return len(text.strip()) == 0

def read_docx(path: str | Path) -> str:
    doc = docx.Document(path)
    return "\n".join(p.text.strip() for p in doc.paragraphs if p.text.strip())

def read_txt(path: str | Path) -> str:
    return Path(path).read_text(encoding="utf-8", errors="ignore")

def read_excel(path: str | Path) -> str:
    df = pd.read_excel(path).fillna("")
    return "\n".join(
        df.astype(str).apply(lambda row: " | ".join(row), axis=1)
    )

async def load_document(path: str | Path, max_pages: int | None = None) -> str:
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        if await asyncio.to_thread(is_pdf_scanned, file_path, max_pages):
            return await ocr_pdf(file_path, max_pages=max_pages)
        return await asyncio.to_thread(read_pdf, file_path, max_pages)

    if suffix == ".docx":
        return await asyncio.to_thread(read_docx, file_path)

    if suffix in (".xlsx", ".xls"):
        return await asyncio.to_thread(read_excel, file_path)

    if suffix == ".txt":
        return await asyncio.to_thread(read_txt, file_path)

    if suffix in (".png", ".jpg", ".jpeg", ".tiff", ".bmp"):
        return await asyncio.to_thread(ocr_image, file_path)

    raise ValueError(f"Format non supporté : {file_path}")