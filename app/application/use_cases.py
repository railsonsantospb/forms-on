"""Application use cases - orchestrate domain logic with infrastructure."""

from pathlib import Path
from typing import Literal

from app.domain.entities import Anexo1Payload
from app.domain.services import DateValidationService, PrazoValidationService
from app.domain.ports import DraftRepository, DocumentRenderer, PDFConverter


class PreviewAnexo1UseCase:
    """Use case for previewing Anexo I data with validation."""

    def __init__(
        self,
        date_validator: DateValidationService = None,
        prazo_validator: PrazoValidationService = None,
    ):
        self.date_validator = date_validator or DateValidationService()
        self.prazo_validator = prazo_validator or PrazoValidationService()

    def execute(self, payload: dict) -> dict:
        """Validate and enrich Anexo I payload."""
        # This delegates to existing service for now
        # In future, will use domain entities directly
        from app.services.validate_anexo1 import validate_and_enrich_anexo1
        return validate_and_enrich_anexo1(payload)


class PreviewAnexo2UseCase:
    """Use case for previewing Anexo II data with validation."""

    def __init__(
        self,
        prazo_validator: PrazoValidationService = None,
    ):
        self.prazo_validator = prazo_validator or PrazoValidationService()

    def execute(self, payload: dict) -> dict:
        """Validate and enrich Anexo II payload."""
        from app.services.validate_anexo2 import validate_and_enrich_anexo2
        return validate_and_enrich_anexo2(payload)


class GenerateDocumentUseCase:
    """Use case for generating documents (DOCX/PDF)."""

    def __init__(
        self,
        renderer: DocumentRenderer = None,
        pdf_converter: PDFConverter = None,
    ):
        self.renderer = renderer
        self.pdf_converter = pdf_converter

    def execute(
        self,
        template_path: Path,
        output_path: Path,
        placeholders: dict,
        format: Literal["docx", "pdf"] = "docx",
        **kwargs
    ) -> Path:
        """Generate a document in the requested format."""
        # For now, delegates to existing services
        # This will be refactored when adapters are implemented
        from app.services.docx_render import render_docx_from_template
        render_docx_from_template(template_path, output_path, placeholders, **kwargs)
        return output_path
