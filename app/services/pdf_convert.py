from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path


class LibreOfficeNotAvailableError(Exception):
    """LibreOffice (soffice) não está instalado ou não está no PATH."""

    def __init__(self, message: str = "LibreOffice não está disponível.") -> None:
        super().__init__(message)


def convert_docx_to_pdf(docx_path: Path) -> Path:
    out_dir = docx_path.parent
    # Perfil temporário do LibreOffice em /tmp (container read-only não permite ~/.config)
    user_install = f"file:///tmp/libreoffice_profile_{docx_path.stem}"
    cmd = [
        "soffice",
        "-env:UserInstallation=" + user_install,
        "--headless",
        "--nologo",
        "--nolockcheck",
        "--nodefault",
        "--nofirststartwizard",
        "--convert-to", "pdf",
        "--outdir", str(out_dir),
        str(docx_path),
    ]
    try:
        subprocess.run(cmd, check=True, timeout=30)
    except FileNotFoundError as exc:
        raise LibreOfficeNotAvailableError(
            "LibreOffice não encontrado. Instale-o ou use o Docker."
        ) from exc

    pdf_path = out_dir / (docx_path.stem + ".pdf")
    if not pdf_path.exists():
        raise RuntimeError("Falha ao converter DOCX para PDF.")
    return pdf_path


async def convert_docx_to_pdf_async(docx_path: Path) -> Path:
    return await asyncio.to_thread(convert_docx_to_pdf, docx_path)
