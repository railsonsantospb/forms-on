"""Domain entities and value objects for the forms system."""

from dataclasses import dataclass, field
from datetime import date
from typing import Literal


@dataclass(frozen=True)
class Servidor:
    """Value object representing a public servant."""

    nome_completo: str
    cpf: str
    siape: str
    cargo: str
    orgao_lotacao: str
    email: str
    telefone: str


@dataclass(frozen=True)
class Trecho:
    """Value object representing a travel segment."""

    origem: str
    destino: str
    data_saida: date
    data_chegada: date
    hora_saida: str
    hora_chegada: str
    meio_transporte: Literal[
        "aereo", "rodoviario", "ferroviario", "aquaviario", "outros"
    ]


@dataclass
class Anexo1Payload:
    """Entity representing Anexo I (Travel Request) data."""

    tipo_solicitacao: Literal["diarias", "passagens", "diarias_passagens"]
    servidor: Servidor
    trechos: list[Trecho] = field(default_factory=list)
    missao: str = ""
    motivo: str = ""
    recurso: str = ""
    justificativa_urgencia: str = ""
    justificativa_fora_prazo: str = ""


@dataclass
class Anexo2Payload:
    """Entity representing Anexo II (Travel Report) data."""

    data_prestacao: date
    proposto: Servidor
    periodo_afastamento: str = ""
    atividades_realizadas: list[str] = field(default_factory=list)
    alteracoes_itinerario: list[str] = field(default_factory=list)
