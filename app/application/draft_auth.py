"""Draft token authentication — isolates token logic from route handlers."""

from __future__ import annotations

import hashlib
import hmac

from fastapi import HTTPException, Request

from app.core.logging import get_logger

logger = get_logger("security")


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def require_draft_token(request: Request, draft: dict) -> None:
    """Raise HTTP 403 if the request does not carry a valid draft token."""
    expected = draft.get("_token_hash")
    provided = request.headers.get("x-draft-token", "")
    trace_id = getattr(request.state, "trace_id", "unknown")
    client_ip = request.headers.get("x-real-ip") or (
        request.client.host if request.client else "unknown"
    )

    if not expected or not provided:
        logger.warning(
            "draft_token_missing",
            extra={"trace_id": trace_id, "ip": client_ip, "path": str(request.url.path)},
        )
        raise HTTPException(403, "Token do rascunho obrigatório.")

    if not hmac.compare_digest(expected, hash_token(provided)):
        logger.warning(
            "draft_token_invalid",
            extra={"trace_id": trace_id, "ip": client_ip, "path": str(request.url.path)},
        )
        raise HTTPException(403, "Token do rascunho inválido.")


def public_draft(draft: dict) -> dict:
    """Strip internal fields (prefixed with '_') from a draft before returning."""
    return {k: v for k, v in draft.items() if not k.startswith("_")}
