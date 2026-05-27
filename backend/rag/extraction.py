"""
Text extraction from supported file types.
Models (ocr) are accessed via rag.store to avoid loading at import time.
"""

import os
from fastapi import HTTPException
from backend.utils.logger import logger


def extract_text_from_image(image_path: str) -> str:
    from backend.rag import store
    try:
        result = store.ocr.ocr(image_path)
        lines  = []
        for page in result:
            for line in page:
                lines.append(line[1][0])
        return "\n".join(lines)
    except Exception as e:
        logger.error("OCR failed for %s: %s", image_path, e)
        raise HTTPException(status_code=500, detail=f"OCR failed: {e}")


def extract_text_from_pdf(pdf_path: str) -> str:
    import fitz
    try:
        doc      = fitz.open(pdf_path)
        all_text = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                all_text.append(text)
            else:
                pix      = page.get_pixmap()
                img_path = f"temp_page_{page_num}.png"
                pix.save(img_path)
                all_text.append(extract_text_from_image(img_path))
                try:
                    os.remove(img_path)
                except OSError:
                    pass
        return "\n".join(all_text)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("PDF extraction failed for %s: %s", pdf_path, e)
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {e}")


def extract_text_from_docx(docx_path: str) -> str:
    import docx as python_docx
    try:
        doc = python_docx.Document(docx_path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except Exception as e:
        logger.error("DOCX extraction failed for %s: %s", docx_path, e)
        raise HTTPException(status_code=500, detail=f"DOCX extraction failed: {e}")


def extract_text_from_txt(txt_path: str) -> str:
    try:
        with open(txt_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception as e:
        logger.error("TXT extraction failed for %s: %s", txt_path, e)
        raise HTTPException(status_code=500, detail=f"TXT extraction failed: {e}")


def extract_text(file_path: str) -> str:
    ext = file_path.lower().rsplit(".", 1)[-1]
    if ext in ("png", "jpg", "jpeg", "bmp", "tiff", "webp"):
        return extract_text_from_image(file_path)
    if ext == "pdf":
        return extract_text_from_pdf(file_path)
    if ext == "docx":
        return extract_text_from_docx(file_path)
    if ext == "txt":
        return extract_text_from_txt(file_path)
    raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")
