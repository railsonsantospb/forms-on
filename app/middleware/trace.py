"""Middleware to inject trace ID into requests for distributed tracing."""

import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import get_logger

logger = get_logger("trace")


class TraceIDMiddleware(BaseHTTPMiddleware):
    """Injects a trace ID into every request for correlation."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Get trace ID from header or generate new one
        trace_id = request.headers.get("x-trace-id", str(uuid.uuid4()))
        request.state.trace_id = trace_id

        # Log request start
        logger.info(
            "request_started",
            extra={
                "trace_id": trace_id,
                "method": request.method,
                "path": str(request.url.path),
                "client_ip": request.headers.get("x-real-ip")
                or (request.client.host if request.client else "unknown"),
            },
        )

        response = await call_next(request)

        # Add trace ID to response headers
        response.headers["x-trace-id"] = trace_id

        # Log request completion
        logger.info(
            "request_completed",
            extra={
                "trace_id": trace_id,
                "method": request.method,
                "path": str(request.url.path),
                "status_code": response.status_code,
            },
        )

        return response
