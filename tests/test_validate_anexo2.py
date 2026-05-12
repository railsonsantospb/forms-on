"""
Testes para app/services/validate_anexo2.py
Cobre: afastamento, atividades, prazo de relatório, cidades, justificativas.
"""
from __future__ import annotations

import sys
import os
from copy import deepcopy
from unittest.mock import patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.validate_anexo2 import validate_and_enrich_anexo2

_patches = [
    patch("app.services.validate_anexo2.build_placeholders_anexo2", return_value={}),
    patch("app.services.validate_anexo2.build_rows_anexo2", return_value={}),
    patch("app.services.validate_anexo2.build_atividades_rows", return_value=[]),
    patch("app.services.validate_anexo2.build_alteracoes_rows", return_value=[]),
]
for p in _patches:
    p.start()


BASE_PAYLOAD = {
    "data_relatorio": "2026-05-25",
    "proposto": {
        "nome": "João Silva",
        "cpf": "12345678901",
        "siape": "1234",
        "cargo_funcao": "Professor",
        "telefone": "83999999999",
        "email": "joao@ufpb.br",
        "orgao": {"tipo": "cchsa"},
    },
    "afastamento": {
        "ida": [{"origem": "João Pessoa", "destino": "Recife", "data_hora": "2026-05-20T08:00"}],
        "retorno": [{"origem": "Recife", "destino": "João Pessoa", "data_hora": "2026-05-22T18:00"}],
    },
    "atividades_tabela": [
        {"data": "2026-05-21", "horario": "09:00", "cidade": "Recife", "atividades": "Participação no evento"},
    ],
    "viagem_realizada": "sim",
    "flags": {},
    "justificativa_prestacao_contas_fora_prazo": "",
}


def make_payload(**overrides):
    p = deepcopy(BASE_PAYLOAD)
    p.update(overrides)
    return p


def error_fields(result):
    return {e["field"] for e in result.get("errors", [])}


class TestAfastamento:
    def test_payload_valido(self):
        r = validate_and_enrich_anexo2(make_payload())
        assert r["ok"] is True

    def test_ida_ausente(self):
        p = make_payload()
        p["afastamento"]["ida"] = []
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is False
        assert "afastamento.ida" in error_fields(r)

    def test_retorno_ausente(self):
        p = make_payload()
        p["afastamento"]["retorno"] = []
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is False
        assert "afastamento.retorno" in error_fields(r)

    def test_retorno_anterior_a_ida(self):
        p = make_payload()
        p["afastamento"]["retorno"][0]["data_hora"] = "2026-05-19T08:00"
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is False
        assert "afastamento" in error_fields(r)

    def test_ida_sem_data_hora(self):
        p = make_payload()
        p["afastamento"]["ida"][0]["data_hora"] = ""
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is False

    def test_normaliza_dict_para_lista(self):
        p = make_payload()
        p["afastamento"]["ida"] = {"origem": "João Pessoa", "destino": "Recife", "data_hora": "2026-05-20T08:00"}
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is True


class TestMesmaCidadeAfastamento:
    def test_origem_igual_destino_ida(self):
        p = make_payload()
        p["afastamento"]["ida"][0]["destino"] = "João Pessoa"
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is False
        assert "afastamento.ida.0.destino" in error_fields(r)

    def test_origem_igual_destino_retorno(self):
        p = make_payload()
        p["afastamento"]["retorno"][0]["destino"] = "Recife"
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is False
        assert "afastamento.retorno.0.destino" in error_fields(r)


class TestEncadeamentoAfastamento:
    def test_destino_ida_diferente_de_origem_retorno(self):
        p = make_payload()
        p["afastamento"]["retorno"][0]["origem"] = "Natal"
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is False
        assert "afastamento.retorno.0.origem" in error_fields(r)

    def test_multiplos_trechos_encadeados_corretos(self):
        p = make_payload()
        p["afastamento"]["ida"] = [
            {"origem": "João Pessoa", "destino": "Recife", "data_hora": "2026-05-20T08:00"},
            {"origem": "Recife", "destino": "Fortaleza", "data_hora": "2026-05-21T08:00"},
        ]
        p["afastamento"]["retorno"] = [
            {"origem": "Fortaleza", "destino": "João Pessoa", "data_hora": "2026-05-22T18:00"},
        ]
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is True

    def test_multiplos_trechos_encadeamento_quebrado(self):
        p = make_payload()
        p["afastamento"]["ida"] = [
            {"origem": "João Pessoa", "destino": "Recife", "data_hora": "2026-05-20T08:00"},
            {"origem": "Natal", "destino": "Fortaleza", "data_hora": "2026-05-21T08:00"},
        ]
        p["afastamento"]["retorno"] = [
            {"origem": "Fortaleza", "destino": "João Pessoa", "data_hora": "2026-05-22T18:00"},
        ]
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is False
        assert "afastamento.ida.1.origem" in error_fields(r)


class TestAtividades:
    def test_tabela_vazia(self):
        r = validate_and_enrich_anexo2(make_payload(atividades_tabela=[]))
        assert r["ok"] is False
        assert "atividades_tabela" in error_fields(r)

    def test_tabela_ausente(self):
        p = make_payload()
        del p["atividades_tabela"]
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is False
        assert "atividades_tabela" in error_fields(r)

    def test_tabela_sem_atividades_preenchidas(self):
        r = validate_and_enrich_anexo2(make_payload(atividades_tabela=[
            {"data": "2026-05-21", "horario": "09:00", "cidade": "Recife", "atividades": ""},
            {"data": "2026-05-22", "horario": "10:00", "cidade": "Recife", "atividades": "   "},
        ]))
        assert r["ok"] is False
        assert "atividades_tabela" in error_fields(r)

    def test_tabela_com_uma_atividade_valida(self):
        r = validate_and_enrich_anexo2(make_payload(atividades_tabela=[
            {"data": "2026-05-21", "atividades": ""},
            {"data": "2026-05-22", "atividades": "Reunião técnica"},
        ]))
        assert r["ok"] is True

    def test_tabela_com_item_nao_dict_ignorado(self):
        r = validate_and_enrich_anexo2(make_payload(atividades_tabela=[
            "string_invalida",
            {"data": "2026-05-21", "atividades": "Reunião técnica"},
        ]))
        assert r["ok"] is True


class TestPrazoRelatorio:
    def test_dentro_do_prazo(self):
        # retorno=22/05, limite=27/05, relatorio=25/05 → dentro
        r = validate_and_enrich_anexo2(make_payload(data_relatorio="2026-05-25"))
        assert r["ok"] is True
        assert r["flags"]["prestacao_contas_fora_prazo"] is False

    def test_exatamente_no_limite_nao_e_fora(self):
        # retorno=22/05 + 5 dias = 27/05 → relatorio=27/05 → NOT fora
        r = validate_and_enrich_anexo2(make_payload(data_relatorio="2026-05-27"))
        assert r["ok"] is True
        assert r["flags"]["prestacao_contas_fora_prazo"] is False

    def test_fora_do_prazo_sem_justificativa(self):
        # relatorio=28/05 > limite=27/05
        r = validate_and_enrich_anexo2(make_payload(data_relatorio="2026-05-28"))
        assert r["ok"] is False
        assert r["flags"]["prestacao_contas_fora_prazo"] is True
        assert "justificativa_prestacao_contas_fora_prazo" in error_fields(r)

    def test_fora_do_prazo_com_justificativa_ok(self):
        r = validate_and_enrich_anexo2(make_payload(
            data_relatorio="2026-05-28",
            justificativa_prestacao_contas_fora_prazo="Atraso por motivo de saúde devidamente atestado.",
        ))
        assert r["ok"] is True
        assert r["flags"]["prestacao_contas_fora_prazo"] is True

    def test_fora_do_prazo_justificativa_espacos_rejeitada(self):
        r = validate_and_enrich_anexo2(make_payload(
            data_relatorio="2026-05-28",
            justificativa_prestacao_contas_fora_prazo="   ",
        ))
        assert r["ok"] is False
        assert "justificativa_prestacao_contas_fora_prazo" in error_fields(r)


class TestAlteracoesCancelamentos:
    def test_string_antiga_normalizada_para_lista_vazia(self):
        p = make_payload(alteracoes_cancelamentos_noshow="texto antigo")
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is True
        assert p["alteracoes_cancelamentos_noshow"] == []

    def test_lista_com_dicts_preservada(self):
        p = make_payload(alteracoes_cancelamentos_noshow=[
            {"descricao": "Voo cancelado"},
            "string_invalida",
        ])
        r = validate_and_enrich_anexo2(p)
        assert r["ok"] is True
        assert len(p["alteracoes_cancelamentos_noshow"]) == 1
