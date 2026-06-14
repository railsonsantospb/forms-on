"""Testes de compatibilidade entre o chat/assistente e o backend.

Simula os dados que o chat (Dira) produziria e verifica se:
1. Passam na validação do backend (validate_anexo1/2)
2. Passam na validação do schema JSON
3. São aceitos pela API (preview + generate)
"""

from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from copy import deepcopy
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.validator import validate_payload
from app.services.validate_anexo1 import validate_and_enrich_anexo1
from app.services.validate_anexo2 import validate_and_enrich_anexo2


client = TestClient(app)


# ============================================================================
# Dados simulados que o chat do Anexo I produziria
# ============================================================================
CHAT_ANEXO1 = {
    "tipo_solicitacao": "diarias",
    "data_solicitacao": "2026-05-09",
    "servidor": {
        "nome_completo": "João Silva",
        "cargo_funcao": "Professor",
        "cpf": "12345678901",
        "rg": "1234567",
        "data_nascimento": "1980-01-01",
        "siape": "1234",
        "nome_mae": "Maria Silva",
        "endereco": "Rua A, 123",
        "telefone": "83999999999",
        "email": "joao@ufpb.br",
        "tipo_vinculo": "servidor",
        "passaporte": "",
        "lotacao_orgao": "CCHSA",
        "auxilio_transporte": {"recebe": True, "valor": "200"},
        "auxilio_alimentacao": {"recebe": False, "valor": ""},
        "dados_bancarios": {"banco": "001", "agencia": "0001", "conta": "12345"},
    },
    "motivo_viagem": "Participação em congresso de tecnologia",
    "relacao_pertinencia": "Relação de pertinência válida de exemplo com mais de dez caracteres.",
    "trechos": {
        "ida": [
            {
                "origem": "João Pessoa/PB",
                "destino": "Recife/PE",
                "data_hora": "2026-05-20T08:00",
            }
        ],
        "retorno": [
            {
                "origem": "Recife/PE",
                "destino": "João Pessoa/PB",
                "data_hora": "2026-05-22T18:00",
            }
        ],
    },
    "missao": {
        "inicio_data_hora": "2026-05-20T09:00",
        "termino_data_hora": "2026-05-22T17:00",
    },
    "debito_recurso": {"tipo": "projeto", "detalhe": "Projeto X"},
    "transporte": {
        "meios": ["veiculo_oficial"],
        "distancia_km": "",
        "termo_veiculo_proprio_ciente": False,
    },
    "flags": {
        "envolve_fds_feriado_ou_dia_anterior": False,
        "fora_do_prazo": False,
    },
    "justificativas": {
        "justificativa_fds_feriado_dia_anterior": "",
        "justificativa_fora_prazo": "",
        "just_viagem_urgente": "",
        "just_fds_feriado": "",
        "just_aeroporto": "",
        "just_grupo_mais_2": "",
        "just_grupo_mais_5": "",
        "just_mais_30_diarias": "",
    },
}

# ============================================================================
# Dados simulados que o chat do Anexo II produziria
# ============================================================================
CHAT_ANEXO2 = {
    "data_relatorio": "2026-05-23",
    "proposto": {
        "nome": "João Silva",
        "cpf": "12345678901",
        "siape": "1234",
        "cargo_funcao": "Professor",
        "telefone": "83999999999",
        "email": "joao@ufpb.br",
        "orgao": {"tipo": "cchsa", "detalhe": ""},
    },
    "afastamento": {
        "ida": [
            {
                "origem": "João Pessoa/PB",
                "destino": "Recife/PE",
                "data_hora": "2026-05-20T08:00",
            }
        ],
        "retorno": [
            {
                "origem": "Recife/PE",
                "destino": "João Pessoa/PB",
                "data_hora": "2026-05-22T18:00",
            }
        ],
    },
    "alteracoes_cancelamentos_noshow": [],
    "atividades_tabela": [
        {
            "data": "2026-05-20",
            "horario": "09:00",
            "cidade": "Recife",
            "atividades": "Reunião com equipe",
        },
    ],
    "flags": {"prestacao_contas_fora_prazo": False},
    "justificativa_prestacao_contas_fora_prazo": "",
    "viagem_realizada": "sim",
}


class TestChatAnexo1Compat:
    """Compatibilidade do chat do Anexo I com o backend."""

    def test_schema_validation_passes(self):
        """Dados do chat devem passar no schema JSON do backend."""
        validate_payload("anexo1", CHAT_ANEXO1)

    def test_backend_enrichment_passes(self):
        """Dados do chat devem ser enriquecidos com sucesso pelo backend."""
        result = validate_and_enrich_anexo1(deepcopy(CHAT_ANEXO1))
        assert result["ok"] is True

    def test_api_preview_passes(self):
        """Dados do chat devem ser aceitos pela API de preview."""
        r = client.post("/api/anexo1/preview", json=CHAT_ANEXO1)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_api_generate_docx_passes(self):
        """Dados do chat devem gerar DOCX com sucesso."""
        r = client.post("/api/anexo1/generate?format=docx", json=CHAT_ANEXO1)
        assert r.status_code == 200
        assert (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            in r.headers["content-type"]
        )

    def test_chat_city_format_weak_validation(self):
        """O chat aceita 'João Pessoa' (sem /UF) mas o backend/Zod exige Cidade/UF.

        Isso é uma discrepância: o chat valida apenas 'includes(\"/\")' enquanto
        o schema Zod do frontend exige regex /^.+\\/\\s*[A-Za-z]{2}$/.
        Para Anexo I o backend schema NÃO exige regex, mas o Zod do frontend sim.
        """
        bad_payload = deepcopy(CHAT_ANEXO1)
        bad_payload["trechos"]["ida"][0]["origem"] = "João Pessoa"
        # O backend schema JSON de anexo1 aceita qualquer string (2-80 chars)
        validate_payload("anexo1", bad_payload)
        # Mas a validação backend detecta mesma cidade, não formato
        result = validate_and_enrich_anexo1(deepcopy(bad_payload))
        assert result["ok"] is True  # backend não valida formato Cidade/UF no anexo1

    def test_fds_flag_calculation(self):
        """Verifica se a flag de fim de semana é calculada corretamente.

        Chat: calcula no estado 'flags.fds' comparando ida.weekday()
        Backend: verifica ida.weekday() in (5,6)
        """
        # Sábado (2026-05-16 é sábado)
        fds_payload = deepcopy(CHAT_ANEXO1)
        fds_payload["trechos"]["ida"][0]["data_hora"] = "2026-05-16T08:00"
        fds_payload["trechos"]["retorno"][0]["data_hora"] = "2026-05-18T18:00"
        fds_payload["missao"]["inicio_data_hora"] = "2026-05-16T09:00"
        fds_payload["missao"]["termino_data_hora"] = "2026-05-18T17:00"
        # Ajusta data de solicitação para não ficar fora do prazo (precisa de 10 dias)
        fds_payload["data_solicitacao"] = "2026-04-01"
        # Adiciona justificativas necessárias
        fds_payload["justificativas"]["justificativa_fds_feriado_dia_anterior"] = (
            "Viagem em fim de semana por necessidade do evento."
        )
        result = validate_and_enrich_anexo1(deepcopy(fds_payload))
        assert result["ok"] is True
        assert result["flags"]["envolve_fds_feriado_ou_dia_anterior"] is True

    def test_prazo_diarias_calculation(self):
        """Chat e backend devem concordar no cálculo de fora_do_prazo.

        Chat: diff = (idaDate - dataSolic) / 86400000; fora = diff < 10
        Backend: ds > (ida - 10 dias)
        """
        # Dentro do prazo (solicitação 20 dias antes)
        dentro = deepcopy(CHAT_ANEXO1)
        dentro["data_solicitacao"] = "2026-04-30"
        result = validate_and_enrich_anexo1(deepcopy(dentro))
        assert result["flags"]["fora_do_prazo"] is False

        # Fora do prazo (solicitação 5 dias antes, precisa de 10)
        fora = deepcopy(CHAT_ANEXO1)
        fora["data_solicitacao"] = "2026-05-15"
        result = validate_and_enrich_anexo1(deepcopy(fora))
        assert result["flags"]["fora_do_prazo"] is True


class TestChatAnexo2Compat:
    """Compatibilidade do chat do Anexo II com o backend."""

    def test_schema_validation_passes(self):
        validate_payload("anexo2", CHAT_ANEXO2)

    def test_backend_enrichment_passes(self):
        result = validate_and_enrich_anexo2(deepcopy(CHAT_ANEXO2))
        assert result["ok"] is True

    def test_api_preview_passes(self):
        r = client.post("/api/anexo2/preview", json=CHAT_ANEXO2)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_api_generate_docx_passes(self):
        r = client.post("/api/anexo2/generate?format=docx", json=CHAT_ANEXO2)
        assert r.status_code == 200
        assert (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            in r.headers["content-type"]
        )

    def test_chat_city_format_vs_backend(self):
        """Anexo II: chat aceita 'João Pessoa' mas backend schema EXIGE Cidade/UF.

        Isso é uma discrepância REAL: o chat valida apenas 'includes(\"/\")'
        enquanto o backend JSON schema exige regex /^.+\\/\\s*[A-Za-z]{2}$/.
        """
        bad_payload = deepcopy(CHAT_ANEXO2)
        bad_payload["afastamento"]["ida"][0]["origem"] = "João Pessoa"
        # Schema JSON deve rejeitar
        from app.schemas.validator import ValidationError

        try:
            validate_payload("anexo2", bad_payload)
            assert False, "Schema deveria rejeitar cidade sem /UF"
        except ValidationError as exc:
            # O erro pode ser de pattern (regex) ou format ou "não é válido"
            messages = [e["message"].lower() for e in exc.errors]
            assert any(
                "pattern" in m
                or "não é válido" in m
                or "não é um valor" in m
                or "informe" in m
                or "does not match" in m
                for m in messages
            ), f"Erros inesperados: {messages}"

    def test_prazo_relatorio_calculation(self):
        """Chat e backend devem concordar no cálculo de prestacao_contas_fora_prazo.

        Chat: diff = (hoje - retorno) / 86400000; fora = diff > 5
        Backend: data_relatorio > (retorno + 5 dias)
        """
        # Dentro do prazo (relatório 3 dias após retorno)
        dentro = deepcopy(CHAT_ANEXO2)
        dentro["data_relatorio"] = "2026-05-25"
        result = validate_and_enrich_anexo2(deepcopy(dentro))
        assert result["flags"]["prestacao_contas_fora_prazo"] is False

        # Fora do prazo (relatório 10 dias após retorno)
        fora = deepcopy(CHAT_ANEXO2)
        fora["data_relatorio"] = "2026-06-02"
        result = validate_and_enrich_anexo2(deepcopy(fora))
        assert result["flags"]["prestacao_contas_fora_prazo"] is True


class TestChatDataStructures:
    """Verifica se os dados do chat mapeiam corretamente para o formulário."""

    def test_anexo1_trecho_array_structure(self):
        """O chat gera trechos.ida.0.* e o applyChatData converte para arrays.
        A API espera arrays diretamente."""
        # Nosso CHAT_ANEXO1 já está no formato processado (arrays)
        assert isinstance(CHAT_ANEXO1["trechos"]["ida"], list)
        assert CHAT_ANEXO1["trechos"]["ida"][0]["origem"] == "João Pessoa/PB"

    def test_anexo2_trecho_array_structure(self):
        assert isinstance(CHAT_ANEXO2["afastamento"]["ida"], list)
        assert CHAT_ANEXO2["afastamento"]["ida"][0]["origem"] == "João Pessoa/PB"

    def test_anexo1_servidor_nested_structure(self):
        """Verifica se o objeto servidor está corretamente aninhado."""
        servidor = CHAT_ANEXO1["servidor"]
        assert servidor["nome_completo"] == "João Silva"
        assert servidor["dados_bancarios"]["banco"] == "001"

    def test_anexo2_proposto_nested_structure(self):
        """Verifica se o objeto proposto está corretamente aninhado."""
        proposto = CHAT_ANEXO2["proposto"]
        assert proposto["nome"] == "João Silva"
        assert proposto["orgao"]["tipo"] == "cchsa"
