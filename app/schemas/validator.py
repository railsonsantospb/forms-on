"""Validação de payloads contra schemas JSON."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import validate, ValidationError as JsonSchemaValidationError


_SCHEMAS_DIR = Path(__file__).parent


class ValidationError(Exception):
    """Erro de validação de schema com detalhes dos campos inválidos."""

    def __init__(self, errors: list[dict[str, Any]]):
        self.errors = errors
        super().__init__(f"Validation failed with {len(errors)} error(s)")


def _load_schema(name: str) -> dict[str, Any]:
    path = _SCHEMAS_DIR / f"{name}.schema.json"
    if not path.exists():
        raise RuntimeError(f"Schema file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


# Cache em memória para evitar releitura de disco
_schema_cache: dict[str, dict[str, Any]] = {}


def get_schema(name: str) -> dict[str, Any]:
    if name not in _schema_cache:
        _schema_cache[name] = _load_schema(name)
    return _schema_cache[name]


def validate_payload(name: str, payload: dict[str, Any]) -> None:
    """Valida um payload contra o schema JSON correspondente.

    Args:
        name: Nome do schema (ex: 'anexo1', 'anexo2').
        payload: Dicionário a ser validado.

    Raises:
        ValidationError: Se o payload não for válido.
    """
    schema = get_schema(name)
    try:
        validate(instance=payload, schema=schema)
    except JsonSchemaValidationError as exc:
        errors = []
        for error in exc.context or [exc]:
            path = ".".join(str(p) for p in error.path) if error.path else "root"
            errors.append({
                "field": path,
                "message": error.message,
            })
        raise ValidationError(errors) from exc
