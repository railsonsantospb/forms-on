"""Repository interfaces (Ports) - define contracts for data access."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Protocol


class DraftRepository(Protocol):
    """Port for draft persistence operations."""

    def save(self, draft_id: str, payload: dict) -> None:
        """Save a draft to storage."""
        ...

    def load(self, draft_id: str) -> dict:
        """Load a draft from storage."""
        ...

    def delete(self, draft_id: str) -> None:
        """Delete a draft from storage."""
        ...

    def list_all(self) -> list[str]:
        """List all draft IDs."""
        ...


class TemplateRepository(Protocol):
    """Port for template document access."""

    def get_template_path(self, template_name: str) -> Path:
        """Get the path to a template file."""
        ...

    def template_exists(self, template_name: str) -> bool:
        """Check if a template exists."""
        ...


class DocumentRenderer(Protocol):
    """Port for document rendering operations."""

    def render(
        self,
        template_path: Path,
        output_path: Path,
        placeholders: dict,
        **kwargs
    ) -> None:
        """Render a document from template with placeholders."""
        ...


class PDFConverter(Protocol):
    """Port for PDF conversion operations."""

    def convert(self, docx_path: Path) -> Path:
        """Convert a DOCX file to PDF."""
        ...

    async def convert_async(self, docx_path: Path) -> Path:
        """Asynchronously convert a DOCX file to PDF."""
        ...
