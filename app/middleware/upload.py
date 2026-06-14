"""Upload validation helpers — centralizes file security checks."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import HTTPException, UploadFile

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MAX_FILENAME_LEN = 255

_MAGIC_BYTES: dict[str, tuple[bytes, ...]] = {
    ".pdf": (b"%PDF",),
    ".docx": (b"PK\x03\x04",),
    ".doc": (b"\xd0\xcf\x11\xe0", b"\x31\xbe\x00\x00\x00\x00"),
}

_ALLOWED_MIMES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream",
}


def sanitize_filename(filename: str) -> str:
    sanitized = os.path.basename(filename).replace("..", "")
    if len(sanitized) > MAX_FILENAME_LEN:
        name, ext = os.path.splitext(sanitized)
        sanitized = name[: MAX_FILENAME_LEN - len(ext)] + ext
    return sanitized


def validate_upload(file: UploadFile, content: bytes) -> None:
    """Validate an uploaded file: size, extension, magic bytes, and MIME type.

    Raises HTTPException on any violation.
    """
    if not file.filename:
        raise HTTPException(400, "Nome do arquivo não fornecido.")

    if len(content) == 0:
        raise HTTPException(400, "Arquivo vazio.")

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            413, f"Arquivo muito grande. Limite: {MAX_FILE_SIZE // (1024 * 1024)}MB."
        )

    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400, f"Formato não suportado. Use: {', '.join(ALLOWED_EXTENSIONS)}."
        )

    magics = _MAGIC_BYTES.get(suffix)
    if magics and not any(content.startswith(m) for m in magics):
        raise HTTPException(
            400, "Arquivo corrompido ou formato inválido (magic bytes mismatch)."
        )

    mime_type = file.content_type or ""
    if mime_type and mime_type not in _ALLOWED_MIMES:
        raise HTTPException(400, "Tipo de arquivo não permitido.")
