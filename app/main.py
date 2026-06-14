import os
import re
import secrets
import uuid
from datetime import date
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Literal, Union

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi import APIRouter
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask

from app.settings import settings
from app.middleware.security import (
    SecurityHeadersMiddleware,
    RequestSizeLimitMiddleware,
)
from app.middleware.rate_limit import rate_limit
from app.middleware.upload import validate_upload, sanitize_filename
from app.middleware.trace import TraceIDMiddleware
from app.schemas.validator import validate_payload, ValidationError
from app.services.anexo1_import import (
    extract_prefill_for_anexo1,
    extract_prefill_from_anexo1,
)
from app.services.anexo2_import import extract_prefill_for_anexo2
from app.services.validate_anexo1 import validate_and_enrich_anexo1
from app.services.validate_anexo2 import validate_and_enrich_anexo2
from app.services.docx_render import render_docx_from_template
from app.services.pdf_convert import (
    convert_docx_to_pdf_async,
    LibreOfficeNotAvailableError,
)
from app.infrastructure.repositories import FileSystemDraftRepository
from app.application.draft_auth import hash_token, require_draft_token, public_draft
from app.core.logging import get_logger

logger = get_logger("security")

app = FastAPI(
    title="UFPB Diárias Wizard",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(TraceIDMiddleware)

FRONTEND_DIST = Path("frontend/dist")
HAS_REACT_BUILD = (FRONTEND_DIST / "index.html").exists()

if not HAS_REACT_BUILD:
    app.mount("/static", StaticFiles(directory="app/static"), name="static")

WEB_DIR = Path("app/web")

UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)

_draft_repo = FileSystemDraftRepository()


def _load_html(name: str) -> str:
    return (WEB_DIR / name).read_text(encoding="utf-8")


def _load_404_html() -> str:
    return (WEB_DIR / "404.html").read_text(encoding="utf-8")


def _validate_uuid(draft_id: str) -> None:
    if not UUID_PATTERN.match(draft_id):
        raise HTTPException(400, "ID de rascunho inválido.")


def _save_draft(draft_id: str, payload: dict) -> None:
    _validate_uuid(draft_id)
    _draft_repo.save(draft_id, payload)


def _load_draft(draft_id: str) -> dict:
    _validate_uuid(draft_id)
    try:
        return _draft_repo.load(draft_id)
    except FileNotFoundError:
        raise HTTPException(404, "Rascunho não encontrado.")


# ===== Handlers de erro globais =====

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    trace_id = getattr(request.state, "trace_id", "unknown")
    client_ip = request.headers.get("x-real-ip") or (
        request.client.host if request.client else "unknown"
    )
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
    accept_header = request.headers.get("accept", "")
    is_browser_404 = (
        "text/html" in accept_header
        and exc.status_code == 404
        and not request.url.path.startswith("/api/")
    )
    if is_browser_404:
        return HTMLResponse(content=_load_404_html(), status_code=404)
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


# ===== Páginas HTML =====

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


@app.get("/review", response_class=HTMLResponse)
def review_page():
    return _load_html("review.html")


@app.get("/docs", include_in_schema=False)
@app.get("/redoc", include_in_schema=False)
@app.get("/openapi.json", include_in_schema=False)
async def block_docs():
    raise HTTPException(status_code=404, detail="Not Found")


# ===== API Routes (v1 canonical, legacy /api/ prefix kept as aliases) =====

api_router = APIRouter()


@api_router.post("/drafts")
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
            "_token_hash": hash_token(draft_token),
        },
    )
    return {"draft_id": draft_id, "draft_token": draft_token}


@api_router.get("/server-date")
async def server_date(request: Request):
    return {"date": str(date.today())}


@api_router.get("/drafts/{draft_id}")
@rate_limit(requests_per_minute=60)
async def get_draft(request: Request, draft_id: str):
    draft = _load_draft(draft_id)
    require_draft_token(request, draft)
    return public_draft(draft)


@api_router.patch("/drafts/{draft_id}")
@rate_limit(requests_per_minute=30)
async def patch_draft(request: Request, draft_id: str, data: dict):
    draft = _load_draft(draft_id)
    require_draft_token(request, draft)
    if not isinstance(data, dict):
        raise HTTPException(400, "Dados inválidos.")
    draft["data"] = {**draft.get("data", {}), **data}
    _save_draft(draft_id, draft)
    return {"ok": True}


@api_router.post("/anexo1/preview")
@rate_limit(requests_per_minute=30)
async def preview_anexo1(request: Request, payload: dict):
    validate_payload("anexo1", payload)
    return validate_and_enrich_anexo1(payload)


@api_router.post("/anexo2/preview")
@rate_limit(requests_per_minute=30)
async def preview_anexo2(request: Request, payload: dict):
    validate_payload("anexo2", payload)
    return validate_and_enrich_anexo2(payload)


@api_router.post("/anexo2/prefill-from-anexo1")
@rate_limit(requests_per_minute=10)
async def prefill_anexo2_from_anexo1(request: Request, file: UploadFile = File(...)):
    content = await file.read()
    validate_upload(file, content)
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
    return {"ok": True, "prefill": result.prefill, "warnings": result.warnings, "filename": sanitize_filename(file.filename)}


@api_router.post("/anexo1/prefill-from-anexo1")
@rate_limit(requests_per_minute=10)
async def prefill_anexo1_from_anexo1(request: Request, file: UploadFile = File(...)):
    content = await file.read()
    validate_upload(file, content)
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
    return {"ok": True, "prefill": result.prefill, "warnings": result.warnings, "filename": sanitize_filename(file.filename)}


@api_router.post("/anexo2/prefill-from-anexo2")
@rate_limit(requests_per_minute=10)
async def prefill_anexo2_from_anexo2(request: Request, file: UploadFile = File(...)):
    content = await file.read()
    validate_upload(file, content)
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
    return {"ok": True, "prefill": result.prefill, "warnings": result.warnings, "filename": sanitize_filename(file.filename)}


def _file_response_with_security(path: Path, filename: str, cleanup_files: list[Path]) -> FileResponse:
    response = FileResponse(
        path,
        filename=filename,
        background=BackgroundTask(lambda files: [f.unlink(missing_ok=True) for f in files], cleanup_files),
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@api_router.post("/anexo1/generate")
@rate_limit(requests_per_minute=10)
async def generate_anexo1(
    request: Request, payload: dict, format: Literal["docx", "pdf"] = Query("docx")
):
    validate_payload("anexo1", payload)
    enriched = validate_and_enrich_anexo1(payload)
    if not enriched.get("ok"):
        raise HTTPException(status_code=422, detail=enriched)

    template = settings.templates_dir / "anexo1_template.docx"
    if not template.exists():
        raise HTTPException(500, "Template anexo1_template.docx não encontrado em app/templates.")

    with NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        out_docx = Path(tmp.name)

    render_docx_from_template(
        template, out_docx, enriched["placeholders"],
        rows=enriched.get("rows"),
        atividades_rows=enriched.get("atividades_rows"),
        alteracoes_rows=enriched.get("alteracoes_rows"),
    )

    if format == "docx":
        return _file_response_with_security(out_docx, "anexo1_preenchido.docx", [out_docx])

    try:
        out_pdf = await convert_docx_to_pdf_async(out_docx)
    except LibreOfficeNotAvailableError as exc:
        out_docx.unlink(missing_ok=True)
        raise HTTPException(503, str(exc)) from exc

    return _file_response_with_security(out_pdf, "anexo1_preenchido.pdf", [out_docx, out_pdf])


@api_router.post("/anexo2/generate")
@rate_limit(requests_per_minute=10)
async def generate_anexo2(
    request: Request, payload: dict, format: Literal["docx", "pdf"] = Query("docx")
):
    validate_payload("anexo2", payload)
    enriched = validate_and_enrich_anexo2(payload)
    if not enriched.get("ok"):
        raise HTTPException(status_code=422, detail=enriched)

    template = settings.templates_dir / "anexo2_template.docx"
    if not template.exists():
        raise HTTPException(500, "Template anexo2_template.docx não encontrado em app/templates.")

    with NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        out_docx = Path(tmp.name)

    render_docx_from_template(
        template, out_docx, enriched["placeholders"],
        rows=enriched.get("rows"),
        atividades_rows=enriched.get("atividades_rows"),
        alteracoes_rows=enriched.get("alteracoes_rows"),
    )

    if format == "docx":
        return _file_response_with_security(out_docx, "anexo2_preenchido.docx", [out_docx])

    try:
        out_pdf = await convert_docx_to_pdf_async(out_docx)
    except LibreOfficeNotAvailableError as exc:
        out_docx.unlink(missing_ok=True)
        raise HTTPException(503, str(exc)) from exc

    return _file_response_with_security(out_pdf, "anexo2_preenchido.pdf", [out_docx, out_pdf])


# Registra o router sob /api e /api/v1 (sem duplicar handlers)
app.include_router(api_router, prefix="/api")
app.include_router(api_router, prefix="/api/v1")


# ===== Catch-all para SPA React ou fallback 404 (deve ser a ÚLTIMA rota) =====

_BLOCKED_PATH_PREFIXES = {
    "etc", "var", "sys", "proc", "dev", "root", "home",
    "usr", "bin", "sbin", "lib", "lib64", "tmp", "boot", "opt", "mnt", "media",
}


def _is_safe_path(base: Path, target: Path) -> bool:
    try:
        target.resolve().relative_to(base.resolve())
        return True
    except ValueError:
        return False


def _looks_like_system_probe(full_path: str) -> bool:
    if not full_path:
        return False
    normalized = os.path.normpath(full_path).lstrip("/")
    if not normalized:
        return False
    return normalized.split("/")[0].lower() in _BLOCKED_PATH_PREFIXES


def _static_response(response: Union[FileResponse, HTMLResponse]) -> Union[FileResponse, HTMLResponse]:
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


if HAS_REACT_BUILD:
    @app.get("/{full_path:path}")
    def serve_react(full_path: str, request: Request):
        if ".." in full_path or _looks_like_system_probe(full_path):
            logger.warning(
                "path_traversal_attempt",
                extra={"trace_id": getattr(request.state, "trace_id", "unknown"), "path": full_path},
            )
            return HTMLResponse(content=_load_404_html(), status_code=404)

        safe_path = os.path.normpath(full_path).lstrip("/")
        file_path = FRONTEND_DIST / safe_path
        if file_path.exists() and file_path.is_file() and _is_safe_path(FRONTEND_DIST, file_path):
            return _static_response(FileResponse(str(file_path)))
        return _static_response(HTMLResponse(content=(FRONTEND_DIST / "index.html").read_text(encoding="utf-8")))
else:
    @app.get("/{full_path:path}")
    def serve_404(full_path: str):
        return HTMLResponse(content=_load_404_html(), status_code=404)
