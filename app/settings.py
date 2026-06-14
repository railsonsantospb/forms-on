from dataclasses import dataclass, field
import os
from pathlib import Path


APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent


def _path_from_env(name: str, default: Path) -> Path:
    return Path(os.environ.get(name, str(default))).resolve()


@dataclass(frozen=True)
class Settings:
    data_dir: Path = field(
        default_factory=lambda: _path_from_env(
            "FORMS_ON_DATA_DIR", PROJECT_ROOT / "data"
        )
    )
    templates_dir: Path = field(
        default_factory=lambda: _path_from_env(
            "FORMS_ON_TEMPLATES_DIR", APP_DIR / "templates"
        )
    )
    # conforme o formulário:
    prazo_sem_passagens_dias: int = 10
    prazo_com_passagens_dias: int = 30
    prazo_relatorio_dias: int = 5


settings = Settings()
