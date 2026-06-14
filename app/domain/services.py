"""Domain services - pure business logic without external dependencies."""

from datetime import date, timedelta
from typing import Literal, Optional

from app.domain.entities import Trecho


class ValidationResult:
    """Result of a validation operation."""
    def __init__(self, ok: bool = True, errors: list[dict] = None):
        self.ok = ok
        self.errors = errors or []

    def add_error(self, field: str, message: str, code: str = "invalid"):
        self.ok = False
        self.errors.append({"field": field, "message": message, "code": code})

    def to_dict(self) -> dict:
        return {"ok": self.ok, "errors": self.errors}


class DateValidationService:
    """Pure domain service for date validation rules."""

    @staticmethod
    def validate_trecho_dates(trechos: list[Trecho]) -> ValidationResult:
        """Validate that travel segments have valid dates."""
        result = ValidationResult()

        for i, trecho in enumerate(trechos):
            if trecho.data_chegada < trecho.data_saida:
                result.add_error(
                    f"trechos[{i}].data_chegada",
                    "Data de chegada não pode ser anterior à data de saída.",
                    "date_order_invalid"
                )

            if trecho.data_saida > date.today() + timedelta(days=365):
                result.add_error(
                    f"trechos[{i}].data_saida",
                    "Data de saída muito distante (máximo 1 ano).",
                    "date_too_far"
                )

        return result

    @staticmethod
    def is_weekend_or_holiday(check_date: date) -> bool:
        """Check if date is weekend (Saturday=5, Sunday=6)."""
        return check_date.weekday() >= 5


class PrazoValidationService:
    """Pure domain service for deadline validation rules."""

    DIARIAS_PRAZO_DIAS = 10
    PASSAGENS_PRAZO_DIAS = 30
    RELATORIO_PRAZO_DIAS = 5

    @classmethod
    def validate_anexo1_prazo(
        cls,
        tipo: Literal["diarias", "passagens", "diarias_passagens"],
        data_ida: date,
        data_solicitacao: Optional[date] = None
    ) -> ValidationResult:
        """Validate if Anexo I request is within deadline."""
        result = ValidationResult()
        if data_solicitacao is None:
            data_solicitacao = date.today()

        if tipo in ("diarias", "diarias_passagens"):
            prazo = data_ida - timedelta(days=cls.DIARIAS_PRAZO_DIAS)
            if data_solicitacao > prazo:
                result.add_error(
                    "prazo",
                    f"Solicitação de diárias deve ser feita com {cls.DIARIAS_PRAZO_DIAS} dias de antecedência.",
                    "fora_do_prazo"
                )

        if tipo in ("passagens", "diarias_passagens"):
            prazo = data_ida - timedelta(days=cls.PASSAGENS_PRAZO_DIAS)
            if data_solicitacao > prazo:
                result.add_error(
                    "prazo",
                    f"Solicitação de passagens deve ser feita com {cls.PASSAGENS_PRAZO_DIAS} dias de antecedência.",
                    "fora_do_prazo"
                )

        return result

    @classmethod
    def validate_anexo2_prazo(
        cls,
        data_retorno: date,
        data_prestacao: Optional[date] = None
    ) -> ValidationResult:
        """Validate if Anexo II report is within deadline."""
        result = ValidationResult()
        if data_prestacao is None:
            data_prestacao = date.today()

        prazo = data_retorno + timedelta(days=cls.RELATORIO_PRAZO_DIAS)
        if data_prestacao > prazo:
            result.add_error(
                "prazo",
                f"Relatório deve ser prestado em até {cls.RELATORIO_PRAZO_DIAS} dias do retorno.",
                "fora_do_prazo"
            )

        return result
