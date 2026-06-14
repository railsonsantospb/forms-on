import json
# import logging  # Replaced by structured logging
import os
import time
import uuid
import re
import hashlib
import hmac
import secrets
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal, Union
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, File, HTTPException, Query, UploadFile, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask

from app.settings import settings
from app.middleware.security import SecurityHeadersMiddleware, RequestSizeLimitMiddleware
from app.middleware.rate_limit import rate_limit
from app.schemas.validator import validate_payload, ValidationError
from app.services.anexo1_import import (
    extract_prefill_for_anexo1,
    extract_prefill_from_anexo1,
)
from app.services.anexo2_import import extract_prefill_for_anexo2
from app.services.validate_anexo1 import validate_and_enrich_anexo1
from app.services.validate_anexo2 import validate_and_enrich_anexo2
from app.services.docx_render import render_docx_from_template
from app.services.pdf_convert import convert_docx_to_pdf, convert_docx_to_pdf_async, LibreOfficeNotAvailableError

from app.core.logging import get_logger
from app.middleware.trace import TraceIDMiddleware

logger = get_logger("security")

app = FastAPI(
    title="UFPB Diárias Wizard",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# API Versioning: v1 router (aliases to legacy routes for backward compatibility)
from fastapi import APIRouter
api_v1_router = APIRouter(prefix="/v1")

# Middlewares de segurança e tracing
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(TraceIDMiddleware)

# Detecta se existe build do React
FRONTEND_DIST = Path("frontend/dist")
HAS_REACT_BUILD = (FRONTEND_DIST / "index.html").exists()

if not HAS_REACT_BUILD:
    # Fallback: serve o frontend antigo (vanilla JS)
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

WEB_DIR = Path("app/web")

# Constantes de segurança
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
UUID_PATTERN = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
MAX_FILENAME_LEN = 255

# Magic bytes para validação de arquivos
MAGIC_BYTES = {
    ".pdf": (b"%PDF",),
    ".docx": (b"PK\x03\x04",),  # ZIP header (DOCX é um ZIP)
    ".doc": (b"\xd0\xcf\x11\xe0", b"\x31\xbe\x00\x00\x00\x00"),  # OLE ou OLD Word
}


def _load_html(name: str) -> str:
    return (WEB_DIR / name).read_text(encoding="utf-8")


def _validate_uuid(draft_id: str) -> None:
    """Valida se o draft_id é um UUID válido."""
    if not UUID_PATTERN.match(draft_id):
        raise HTTPException(400, "ID de rascunho inválido.")


def _sanitize_filename(filename: str) -> str:
    """Remove path separators e limita tamanho do filename."""
    # Remove path traversal characters
    sanitized = os.path.basename(filename).replace("..", "")
    # Limita tamanho
    if len(sanitized) > MAX_FILENAME_LEN:
        name, ext = os.path.splitext(sanitized)
        sanitized = name[:MAX_FILENAME_LEN - len(ext)] + ext
    return sanitized


def _validate_magic_bytes(content: bytes, suffix: str) -> None:
    """Valida file signature (magic bytes) do arquivo."""
    magics = MAGIC_BYTES.get(suffix)
    if not magics:
        return
    if not any(content.startswith(m) for m in magics):
        raise HTTPException(400, "Arquivo corrompido ou formato inválido (magic bytes mismatch).")


def _validate_file(file: UploadFile, content: bytes) -> None:
    """Valida arquivo de upload."""
    if not file.filename:
        raise HTTPException(400, "Nome do arquivo não fornecido.")

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Arquivo muito grande. Limite: {MAX_FILE_SIZE // (1024*1024)}MB.")

    if len(content) == 0:
        raise HTTPException(400, "Arquivo vazio.")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Formato não suportado. Use: {', '.join(ALLOWED_EXTENSIONS)}.")

    # Validação de magic bytes (file signature)
    _validate_magic_bytes(content, suffix)

    # Validação adicional de MIME type
    mime_type = file.content_type or ""
    allowed_mimes = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/octet-stream",
    }
    if mime_type and mime_type not in allowed_mimes:
        raise HTTPException(400, "Tipo de arquivo não permitido.")


_CLEANUP_INTERVAL_SECONDS = 3600  # executa no máximo uma vez por hora
_last_cleanup_at: float = 0.0


def _cleanup_old_data_files(days: int = 15) -> None:
    cutoff = datetime.now(timezone.utc).timestamp() - (days * 86400)
    if not settings.data_dir.exists():
        return

    for fp in settings.data_dir.iterdir():
        if not fp.is_file():
            continue
        try:
            modified = fp.stat().st_mtime
        except OSError:
            continue
        if modified < cutoff:
            fp.unlink(missing_ok=True)


def _ensure_data_dir() -> None:
    global _last_cleanup_at
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    now = time.time()
    if now - _last_cleanup_at > _CLEANUP_INTERVAL_SECONDS:
        _last_cleanup_at = now
        _cleanup_old_data_files(15)


def _save_draft(draft_id: str, payload: dict) -> None:
    _ensure_data_dir()
    _validate_uuid(draft_id)
    fp = settings.data_dir / f"{draft_id}.json"
    fp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        fp.chmod(0o600)
    except OSError:
        pass


def _load_draft(draft_id: str) -> dict:
    _validate_uuid(draft_id)
    fp = settings.data_dir / f"{draft_id}.json"
    if not fp.exists():
        raise HTTPException(404, "Rascunho não encontrado.")
    return json.loads(fp.read_text(encoding="utf-8"))


def _hash_draft_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _require_draft_token(request: Request, draft: dict) -> None:
    expected = draft.get("_token_hash")
    provided = request.headers.get("x-draft-token", "")
    trace_id = getattr(request.state, "trace_id", "unknown")
    if not expected or not provided:
        client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")
        logger.warning(
            "draft_token_missing",
            extra={
                "trace_id": trace_id,
                "ip": client_ip,
                "path": str(request.url.path),
            },
        )
        raise HTTPException(403, "Token do rascunho obrigatório.")
    if not hmac.compare_digest(expected, _hash_draft_token(provided)):
        client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")
        logger.warning(
            "draft_token_invalid",
            extra={
                "trace_id": trace_id,
                "ip": client_ip,
                "path": str(request.url.path),
            },
        )
        raise HTTPException(403, "Token do rascunho inválido.")


def _public_draft(draft: dict) -> dict:
    return {key: value for key, value in draft.items() if not key.startswith("_")}


# ===== Página 404 HTML =====
def _load_404_html() -> str:
    return (WEB_DIR / "404.html").read_text(encoding="utf-8")


# ===== Handlers de erro globais =====
@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    trace_id = getattr(request.state, "trace_id", "unknown")
    client_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")
    logger.warning(
        "schema_validation_failed",
        extra={
            "trace_id": trace_id,
            "ip": client_ip,
            "path": str(request.url.path),
            "errors_count": len(exc.errors),
        },
    )
    return JSONResponse(
        status_code=422,
        content={"detail": "Dados inválidos.", "errors": exc.errors, "trace_id": trace_id},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    trace_id = getattr(request.state, "trace_id", "unknown")
    # Para requisições web (navegador), retorna página HTML 404
    accept_header = request.headers.get("accept", "")
    is_browser_request = (
        "text/html" in accept_header
        and exc.status_code == 404
        and not request.url.path.startswith("/api/")
    )

    if is_browser_request:
        return HTMLResponse(
            content=_load_404_html(),
            status_code=404,
        )

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "trace_id": trace_id},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    trace_id = getattr(request.state, "trace_id", "unknown")
    logger.error(
        "unhandled_exception",
        extra={
            "trace_id": trace_id,
            "path": str(request.url.path),
            "exception_type": type(exc).__name__,
        },
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor.", "trace_id": trace_id},
    )


# ===== Rotas =====
@app.get("/", response_class=HTMLResponse)
def home():
    if HAS_REACT_BUILD:
        return (FRONTEND_DIST / "index.html").read_text(encoding="utf-8")
    return _load_html("index.html")


@app.get("/anexo1", response_class=HTMLResponse)
def anexo1_page():
    if HAS_REACT_BUILD:
        return (FRONTEND_DIST / "index.html").read_text(encoding="utf-8")
    return _load_html("anexo1.html")


@app.get("/anexo2", response_class=HTMLResponse)
def anexo2_page():
    if HAS_REACT_BUILD:
        return (FRONTEND_DIST / "index.html").read_text(encoding="utf-8")
    return _load_html("anexo2.html")


@app.post("/api/drafts")
@rate_limit(requests_per_minute=20)
async def create_draft(request: Request, kind: Literal["anexo1", "anexo2"]):
    draft_id = str(uuid.uuid4())
    draft_token = secrets.token_urlsafe(32)
    _save_draft(
        draft_id,
        {
            "kind": kind,
            "created_at": str(date.today()),
            "data": {},
            "_token_hash": _hash_draft_token(draft_token),
        },
    )
    return {"draft_id": draft_id, "draft_token": draft_token}


@app.get("/api/server-date")
async def server_date(request: Request):
    return {"date": str(date.today())}


@app.get("/api/drafts/{draft_id}")
@rate_limit(requests_per_minute=60)
async def get_draft(request: Request, draft_id: str):
    draft = _load_draft(draft_id)
    _require_draft_token(request, draft)
    return _public_draft(draft)


@app.patch("/api/drafts/{draft_id}")
@rate_limit(requests_per_minute=30)
async def patch_draft(request: Request, draft_id: str, data: dict):
    draft = _load_draft(draft_id)
    _require_draft_token(request, draft)
    # Valida estrutura mínima: rejeita campos que não sejam dict
    if not isinstance(data, dict):
        raise HTTPException(400, "Dados inválidos.")
    draft["data"] = {**draft.get("data", {}), **data}
    _save_draft(draft_id, draft)
    return {"ok": True}


@app.post("/api/anexo1/preview")
@rate_limit(requests_per_minute=30)
async def preview_anexo1(request: Request, payload: dict):
    validate_payload("anexo1", payload)
    enriched = validate_and_enrich_anexo1(payload)
    return enriched


@app.post("/api/anexo2/preview")
@rate_limit(requests_per_minute=30)
async def preview_anexo2(request: Request, payload: dict):
    validate_payload("anexo2", payload)
    enriched = validate_and_enrich_anexo2(payload)
    return enriched


@app.post("/api/anexo2/prefill-from-anexo1")
@rate_limit(requests_per_minute=10)
async def prefill_anexo2_from_anexo1(request: Request, file: UploadFile = File(...)):
    content = await file.read()
    _validate_file(file, content)
    suffix = Path(file.filename).suffix.lower() if file.filename else ".pdf"

    tmp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)

        result = extract_prefill_from_anexo1(tmp_path)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception:
        raise HTTPException(400, "Não foi possível extrair dados do Anexo I. Confirme se o arquivo está legível.")
    finally:
        if tmp_path:
            tmp_path.unlink(missing_ok=True)

    return {
        "ok": True,
        "prefill": result.prefill,
        "warnings": result.warnings,
        "filename": _sanitize_filename(file.filename),
    }


@app.post("/api/anexo1/prefill-from-anexo1")
@rate_limit(requests_per_minute=10)
async def prefill_anexo1_from_anexo1(request: Request, file: UploadFile = File(...)):
    content = await file.read()
    _validate_file(file, content)
    suffix = Path(file.filename).suffix.lower() if file.filename else ".pdf"

    tmp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)

        result = extract_prefill_for_anexo1(tmp_path)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception:
        raise HTTPException(400, "Não foi possível extrair dados do Anexo I. Confirme se o arquivo está legível.")
    finally:
        if tmp_path:
            tmp_path.unlink(missing_ok=True)

    return {
        "ok": True,
        "prefill": result.prefill,
        "warnings": result.warnings,
        "filename": _sanitize_filename(file.filename),
    }


@app.post("/api/anexo2/prefill-from-anexo2")
@rate_limit(requests_per_minute=10)
async def prefill_anexo2_from_anexo2(request: Request, file: UploadFile = File(...)):
    content = await file.read()
    _validate_file(file, content)
    suffix = Path(file.filename).suffix.lower() if file.filename else ".pdf"

    tmp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)

        result = extract_prefill_for_anexo2(tmp_path)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception:
        raise HTTPException(400, "Não foi possível extrair dados do Anexo II. Confirme se o arquivo está legível.")
    finally:
        if tmp_path:
            tmp_path.unlink(missing_ok=True)

    return {
        "ok": True,
        "prefill": result.prefill,
        "warnings": result.warnings,
        "filename": _sanitize_filename(file.filename),
    }


def _add_security_headers_to_file_response(response: FileResponse) -> FileResponse:
    """Adiciona headers de segurança em FileResponse."""
    if not response.headers:
        response.headers = {}
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.post("/api/anexo1/generate")
@rate_limit(requests_per_minute=10)
async def generate_anexo1(request: Request, payload: dict, format: Literal["docx", "pdf"] = Query("docx")):
    validate_payload("anexo1", payload)
    _ensure_data_dir()

    enriched = validate_and_enrich_anexo1(payload)
    if not enriched.get("ok"):
        raise HTTPException(status_code=422, detail=enriched)

    template = settings.templates_dir / "anexo1_template.docx"
    if not template.exists():
        raise HTTPException(500, "Template anexo1_template.docx não encontrado em app/templates.")

    with NamedTemporaryFile(delete=False, suffix=".docx") as tmp_docx:
        out_docx = Path(tmp_docx.name)

    render_docx_from_template(
        template,
        out_docx,
        enriched["placeholders"],
        rows=enriched.get("rows"),
        atividades_rows=enriched.get("atividades_rows"),
        alteracoes_rows=enriched.get("alteracoes_rows"),
    )

    def cleanup(files: list[Path]):
        for f in files:
            f.unlink(missing_ok=True)

    if format == "docx":
        response = FileResponse(
            out_docx,
            filename="anexo1_preenchido.docx",
            background=BackgroundTask(cleanup, [out_docx]),
        )
        return _add_security_headers_to_file_response(response)

    try:
        out_pdf = await convert_docx_to_pdf_async(out_docx)
    except LibreOfficeNotAvailableError as exc:
        cleanup([out_docx])
        raise HTTPException(503, str(exc)) from exc

    response = FileResponse(
        out_pdf,
        filename="anexo1_preenchido.pdf",
        background=BackgroundTask(cleanup, [out_docx, out_pdf]),
    )
    return _add_security_headers_to_file_response(response)


@app.post("/api/anexo2/generate")
@rate_limit(requests_per_minute=10)
async def generate_anexo2(request: Request, payload: dict, format: Literal["docx", "pdf"] = Query("docx")):
    validate_payload("anexo2", payload)
    _ensure_data_dir()

    enriched = validate_and_enrich_anexo2(payload)
    if not enriched.get("ok"):
        raise HTTPException(status_code=422, detail=enriched)

    template = settings.templates_dir / "anexo2_template.docx"
    if not template.exists():
        raise HTTPException(500, "Template anexo2_template.docx não encontrado em app/templates.")

    with NamedTemporaryFile(delete=False, suffix=".docx") as tmp_docx:
        out_docx = Path(tmp_docx.name)

    render_docx_from_template(
        template,
        out_docx,
        enriched["placeholders"],
        rows=enriched.get("rows"),
        atividades_rows=enriched.get("atividades_rows"),
        alteracoes_rows=enriched.get("alteracoes_rows"),
    )

    def cleanup(files: list[Path]):
        for f in files:
            f.unlink(missing_ok=True)

    if format == "docx":
        response = FileResponse(
            out_docx,
            filename="anexo2_preenchido.docx",
            background=BackgroundTask(cleanup, [out_docx]),
        )
        return _add_security_headers_to_file_response(response)

    try:
        out_pdf = await convert_docx_to_pdf_async(out_docx)
    except LibreOfficeNotAvailableError as exc:
        cleanup([out_docx])
        raise HTTPException(503, str(exc)) from exc

    response = FileResponse(
        out_pdf,
        filename="anexo2_preenchido.pdf",
        background=BackgroundTask(cleanup, [out_docx, out_pdf]),
    )
    return _add_security_headers_to_file_response(response)


@app.get("/review", response_class=HTMLResponse)
def review_page():
    return _load_html("review.html")

# ===== Bloqueia rotas de documentação da API =====


@app.get("/docs", include_in_schema=False)
@app.get("/redoc", include_in_schema=False)
@app.get("/openapi.json", include_in_schema=False)
async def block_docs():
    raise HTTPException(status_code=404, detail="Not Found")


def _is_safe_path(base: Path, target: Path) -> bool:
    """Verifica se target está dentro de base (proteção contra path traversal)."""
    try:
        target.resolve().relative_to(base.resolve())
        return True
    except ValueError:
        return False


_BLOCKED_PATH_PREFIXES = {
    "etc", "var", "sys", "proc", "dev", "root", "home", "usr", "bin",
    "sbin", "lib", "lib64", "tmp", "boot", "opt", "mnt", "media",
}


def _looks_like_system_probe(full_path: str) -> bool:
    """Detecta paths que tentam acessar diretórios do sistema ou contêm traversal."""
    if not full_path:
        return False
    normalized = os.path.normpath(full_path).lstrip("/")
    if not normalized:
        return False
    first_segment = normalized.split("/")[0].lower()
    return first_segment in _BLOCKED_PATH_PREFIXES


def _add_security_headers_to_response(response: Union[FileResponse, HTMLResponse]) -> Union[FileResponse, HTMLResponse]:
    """Adiciona headers de segurança em responses estáticas."""
    if not response.headers:
        response.headers = {}
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ===== API v1 Routes (aliases for backward compatibility) =====
# These provide the same functionality under /api/v1/ prefix
# All legacy /api/ routes remain functional

@api_v1_router.post("/drafts")
@rate_limit(requests_per_minute=20)
async def create_draft_v1(request: Request, kind: Literal["anexo1", "anexo2"]):
    """Create a new draft (v1 API)."""
    return await create_draft(request, kind)


@api_v1_router.get("/server-date")
async def server_date_v1(request: Request):
    """Get current server date (v1 API)."""
    return await server_date(request)


@api_v1_router.get("/drafts/{draft_id}")
@rate_limit(requests_per_minute=60)
async def get_draft_v1(request: Request, draft_id: str):
    """Get draft by ID (v1 API)."""
    return await get_draft(request, draft_id)


@api_v1_router.patch("/drafts/{draft_id}")
@rate_limit(requests_per_minute=30)
async def patch_draft_v1(request: Request, draft_id: str, data: dict):
    """Update draft (v1 API)."""
    return await patch_draft(request, draft_id, data)


@api_v1_router.post("/anexo1/preview")
@rate_limit(requests_per_minute=30)
async def preview_anexo1_v1(request: Request, payload: dict):
    """Preview Anexo I (v1 API)."""
    return await preview_anexo1(request, payload)


@api_v1_router.post("/anexo2/preview")
@rate_limit(requests_per_minute=30)
async def preview_anexo2_v1(request: Request, payload: dict):
    """Preview Anexo II (v1 API)."""
    return await preview_anexo2(request, payload)


@api_v1_router.post("/anexo1/generate")
@rate_limit(requests_per_minute=10)
async def generate_anexo1_v1(request: Request, payload: dict, format: Literal["docx", "pdf"] = Query("docx")):
    """Generate Anexo I document (v1 API)."""
    return await generate_anexo1(request, payload, format)


@api_v1_router.post("/anexo2/generate")
@rate_limit(requests_per_minute=10)
async def generate_anexo2_v1(request: Request, payload: dict, format: Literal["docx", "pdf"] = Query("docx")):
    """Generate Anexo II document (v1 API)."""
    return await generate_anexo2(request, payload, format)


@api_v1_router.post("/anexo1/prefill-from-anexo1")
@rate_limit(requests_per_minute=10)
async def prefill_anexo1_from_anexo1_v1(request: Request, file: UploadFile = File(...)):
    """Extract data from Anexo I file for prefill (v1 API)."""
    return await prefill_anexo1_from_anexo1(request, file)


@api_v1_router.post("/anexo2/prefill-from-anexo1")
@rate_limit(requests_per_minute=10)
async def prefill_anexo2_from_anexo1_v1(request: Request, file: UploadFile = File(...)):
    """Extract data from Anexo I file for Anexo II prefill (v1 API)."""
    return await prefill_anexo2_from_anexo1(request, file)


@api_v1_router.post("/anexo2/prefill-from-anexo2")
@rate_limit(requests_per_minute=10)
async def prefill_anexo2_from_anexo2_v1(request: Request, file: UploadFile = File(...)):
    """Extract data from Anexo II file for prefill (v1 API)."""
    return await prefill_anexo2_from_anexo2(request, file)


# Include the v1 router
app.include_router(api_v1_router, prefix="/api")


# ===== Catch-all para SPA React ou fallback 404 =====
# Deve ser a ÚLTIMA rota.
if HAS_REACT_BUILD:
    @app.get("/{full_path:path}")
    def serve_react(full_path: str, request: Request):
        # Sanitiza path para evitar path traversal (../etc/passwd)
        # Rejeita imediatamente qualquer path que contenha '..' antes de normalizar
        if ".." in full_path or _looks_like_system_probe(full_path):
            trace_id = getattr(request.state, "trace_id", "unknown")
            logger.warning(
                "path_traversal_attempt",
                extra={
                    "trace_id": trace_id,
                    "path": full_path,
                },
            )
            return HTMLResponse(content=_load_404_html(), status_code=404)

        safe_path = os.path.normpath(full_path).lstrip("/")
        file_path = FRONTEND_DIST / safe_path
        if file_path.exists() and file_path.is_file() and _is_safe_path(FRONTEND_DIST, file_path):
            response = FileResponse(str(file_path))
            return _add_security_headers_to_response(response)
        return _add_security_headers_to_response(
            HTMLResponse(content=(FRONTEND_DIST / "index.html").read_text(encoding="utf-8"))
        )
else:
    # Fallback vanilla: serve página 404 para rotas não encontradas
    @app.get("/{full_path:path}")
    def serve_404(full_path: str):
        return HTMLResponse(content=_load_404_html(), status_code=404)
