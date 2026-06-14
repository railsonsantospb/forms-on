"""Structured JSON logging with trace ID correlation."""

import json
import logging
import sys
import time
import uuid
from typing import Any


class JSONFormatter(logging.Formatter):
    """Formatter that outputs JSON lines for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: dict[str, Any] = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "source": {
                "file": record.pathname,
                "line": record.lineno,
                "function": record.funcName,
            },
        }

        # Add trace_id if present
        if hasattr(record, "trace_id"):
            log_data["trace_id"] = record.trace_id

        # Add extra fields
        if hasattr(record, "extra"):
            log_data.update(record.extra)

        # Add exception info
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False, default=str)


def get_logger(name: str) -> logging.Logger:
    """Get a logger with JSON formatting configured."""
    logger = logging.getLogger(name)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)

    return logger


from typing import Optional

def set_trace_id(logger: logging.Logger, trace_id: Optional[str] = None) -> str:
    """Generate or set a trace ID for request correlation."""
    if trace_id is None:
        trace_id = str(uuid.uuid4())
    return trace_id
