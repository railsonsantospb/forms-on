"""Infrastructure adapters - implement domain ports with concrete technology."""

import json
from pathlib import Path

from app.domain.ports import DraftRepository, TemplateRepository
from app.settings import settings


class FileSystemDraftRepository(DraftRepository):
    """Adapter for file-system based draft storage."""

    def __init__(self, data_dir: Path = None):
        self.data_dir = data_dir or settings.data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def save(self, draft_id: str, payload: dict) -> None:
        """Save draft to JSON file."""
        file_path = self.data_dir / f"{draft_id}.json"
        file_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        try:
            file_path.chmod(0o600)
        except OSError:
            pass

    def load(self, draft_id: str) -> dict:
        """Load draft from JSON file."""
        file_path = self.data_dir / f"{draft_id}.json"
        if not file_path.exists():
            raise FileNotFoundError(f"Draft {draft_id} not found")
        return json.loads(file_path.read_text(encoding="utf-8"))

    def delete(self, draft_id: str) -> None:
        """Delete draft file."""
        file_path = self.data_dir / f"{draft_id}.json"
        file_path.unlink(missing_ok=True)

    def list_all(self) -> list[str]:
        """List all draft IDs."""
        return [
            f.stem for f in self.data_dir.glob("*.json")
            if f.is_file()
        ]


class FileSystemTemplateRepository(TemplateRepository):
    """Adapter for file-system based template access."""

    def __init__(self, templates_dir: Path = None):
        self.templates_dir = templates_dir or settings.templates_dir

    def get_template_path(self, template_name: str) -> Path:
        """Get path to template file."""
        return self.templates_dir / template_name

    def template_exists(self, template_name: str) -> bool:
        """Check if template exists."""
        return (self.templates_dir / template_name).exists()
