"""
file_extractor.py
------------------
Extracts plain text from an uploaded PDF or DOCX CV file, so it can be
fed into the existing analyze_cv() pipeline unchanged. Deliberately
scoped to extraction only - no OCR (won't read scanned/image-only
PDFs), no layout/formatting preservation, just page/paragraph text
concatenated in order.
"""

import io

import pymupdf
from docx import Document


class FileExtractionError(Exception):
    """Raised for any file we can't turn into usable text - corrupted,
    empty, unsupported format, or an encrypted PDF - with a message
    intended to be shown directly to the user."""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts and concatenates text from every page of a PDF."""
    try:
        with pymupdf.open(stream=file_bytes, filetype="pdf") as doc:
            if doc.is_encrypted:
                raise FileExtractionError(
                    "This PDF is password-protected. Please upload an unprotected file."
                )
            pages_text = [page.get_text() for page in doc]
    except FileExtractionError:
        raise
    except Exception as exc:
        raise FileExtractionError(
            f"Could not read this PDF - it may be corrupted or not a valid PDF file. ({exc})"
        )

    return "\n".join(pages_text)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extracts and concatenates text from every paragraph of a DOCX."""
    try:
        document = Document(io.BytesIO(file_bytes))
        paragraphs_text = [p.text for p in document.paragraphs]
    except Exception as exc:
        raise FileExtractionError(
            f"Could not read this DOCX file - it may be corrupted or not a valid .docx file. ({exc})"
        )

    return "\n".join(paragraphs_text)


def extract_text_from_file(filename: str, file_bytes: bytes) -> str:
    """
    Dispatches to the right extractor based on file extension, then
    validates the result isn't empty (e.g. a scanned/image-only PDF
    with no selectable text would otherwise silently produce nothing
    for analyze_cv() to work with).
    """
    lowered = filename.lower()

    if lowered.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif lowered.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
    else:
        raise FileExtractionError(
            "Unsupported file type. Please upload a .pdf or .docx file."
        )

    if not text.strip():
        raise FileExtractionError(
            "No readable text was found in this file. If it's a scanned/image-only "
            "PDF, text extraction won't work - try pasting the CV text directly instead."
        )

    return text
