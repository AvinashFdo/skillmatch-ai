import io

import pymupdf
from docx import Document


class FileExtractionError(Exception):
    pass


def extract_text_from_pdf(file_bytes: bytes) -> tuple:
    try:
        with pymupdf.open(stream=file_bytes, filetype="pdf") as doc:
            if doc.is_encrypted:
                raise FileExtractionError(
                    "This PDF is password-protected. Please upload an unprotected file."
                )
            page_count = doc.page_count
            pages_text = [page.get_text() for page in doc]
    except FileExtractionError:
        raise
    except Exception as exc:
        raise FileExtractionError(
            f"Could not read this PDF - it may be corrupted or not a valid PDF file. ({exc})"
        )

    return "\n".join(pages_text), page_count


def extract_text_from_docx(file_bytes: bytes) -> tuple:
    try:
        document = Document(io.BytesIO(file_bytes))
        paragraphs_text = [p.text for p in document.paragraphs]
    except Exception as exc:
        raise FileExtractionError(
            f"Could not read this DOCX file - it may be corrupted or not a valid .docx file. ({exc})"
        )

    return "\n".join(paragraphs_text), None


def extract_text_from_file(filename: str, file_bytes: bytes) -> dict:
    lowered = filename.lower()

    if lowered.endswith(".pdf"):
        text, page_count = extract_text_from_pdf(file_bytes)
    elif lowered.endswith(".docx"):
        text, page_count = extract_text_from_docx(file_bytes)
    else:
        raise FileExtractionError(
            "Unsupported file type. Please upload a .pdf or .docx file."
        )

    if not text.strip():
        raise FileExtractionError(
            "No readable text was found in this file. If it's a scanned/image-only "
            "PDF, text extraction won't work - try pasting the CV text directly instead."
        )

    return {"text": text, "page_count": page_count}
