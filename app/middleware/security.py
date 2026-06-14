"""Middlewares de segurança para a aplicação FastAPI."""

from __future__ import annotations

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adiciona headers de segurança HTTP em todas as respostas."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Previne MIME-sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Previne clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS Protection (legado, mas ainda útil)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions Policy
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
            "magnetometer=(), microphone=(), payment=(), usb=()"
        )

        # Content Security Policy (CSP)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "frame-src 'none'; "
            "worker-src 'self'; "
            "manifest-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

        # Strict Transport Security (HSTS) - ativa quando detecta proxy HTTPS
        forwarded_proto = request.headers.get("x-forwarded-proto", "")
        if forwarded_proto == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Limita o tamanho do corpo das requisições."""

    MAX_BODY_SIZE = 10 * 1024 * 1024  # 10MB

    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            content_length = request.headers.get("content-length")
            if content_length is not None:
                try:
                    body_size = int(content_length)
                except ValueError:
                    from fastapi.responses import JSONResponse

                    return JSONResponse(
                        status_code=400, content={"detail": "Content-Length inválido."}
                    )
                if body_size > self.MAX_BODY_SIZE:
                    from fastapi.responses import JSONResponse

                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Payload muito grande. Limite: 10MB."},
                    )

        return await call_next(request)
