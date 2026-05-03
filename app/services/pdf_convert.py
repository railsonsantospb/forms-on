from __future__ import annotations

import subprocess
from pathlib import Path

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
    subprocess.run(cmd, check=True, timeout=30)

    pdf_path = out_dir / (docx_path.stem + ".pdf")
    if not pdf_path.exists():
        raise RuntimeError("Falha ao converter DOCX para PDF.")
    return pdf_path
