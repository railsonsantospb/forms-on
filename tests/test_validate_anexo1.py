"""
Testes para app/services/validate_anexo1.py
Cobre: tipo_solicitacao, datas, trechos, missão, cidades, prazo, fim de semana, justificativas.
"""
from __future__ import annotations

import sys
import os
from copy import deepcopy
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.validate_anexo1 import validate_and_enrich_anexo1

MOCK_PLACEHOLDERS = {"campo": "valor"}
MOCK_ROWS = {"ida": [], "retorno": []}

_patches = [
    patch("app.services.validate_anexo1.build_placeholders_anexo1", return_value=MOCK_PLACEHOLDERS),
    patch("app.services.validate_anexo1.build_rows_anexo1", return_value=MOCK_ROWS),
]

for p in _patches:
    p.start()


# ---------------------------------------------------------------------------
# Payload base válido (terça-feira, dentro do prazo)
# ---------------------------------------------------------------------------
BASE_PAYLOAD = {
    "tipo_solicitacao": "diarias",
    "data_solicitacao": "2026-05-01",
    "servidor": {
        "tipo_vinculo": "servidor",
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
        "dados_bancarios": {"banco": "001", "agencia": "0001", "conta": "12345"},
    },
    "motivo_viagem": "Participação em congresso internacional de pesquisa científica",
    "trechos": {
        "ida": [{"origem": "João Pessoa", "destino": "Recife", "data_hora": "2026-05-20T08:00"}],
        "retorno": [{"origem": "Recife", "destino": "João Pessoa", "data_hora": "2026-05-22T18:00"}],
    },
    "missao": {
        "inicio_data_hora": "2026-05-20T09:00",
        "termino_data_hora": "2026-05-22T17:00",
    },
    "debito_recurso": {"tipo": "cchsa"},
    "transporte": {"meios": ["veiculo_oficial"]},
    "flags": {},
    "justificativas": {},
}


def make_payload(**overrides):
    p = deepcopy(BASE_PAYLOAD)
    p.update(overrides)
    return p


def error_fields(result):
    return {e["field"] for e in result.get("errors", [])}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class TestTipoSolicitacao:
    def test_valido_diarias(self):
        r = validate_and_enrich_anexo1(make_payload())
        assert r["ok"] is True

    def test_valido_passagens(self):
        p = make_payload(tipo_solicitacao="passagens", data_solicitacao="2026-04-01")
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is True

    def test_valido_diarias_e_passagens(self):
        p = make_payload(tipo_solicitacao="diarias_e_passagens", data_solicitacao="2026-04-01")
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is True

    def test_invalido_tipo_desconhecido(self):
        r = validate_and_enrich_anexo1(make_payload(tipo_solicitacao="outro"))
        assert r["ok"] is False
        assert "tipo_solicitacao" in error_fields(r)

    def test_invalido_tipo_ausente(self):
        p = make_payload()
        del p["tipo_solicitacao"]
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "tipo_solicitacao" in error_fields(r)


class TestDataSolicitacao:
    def test_ausente(self):
        p = make_payload()
        del p["data_solicitacao"]
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "data_solicitacao" in error_fields(r)


class TestTrechos:
    def test_ida_ausente(self):
        p = make_payload()
        p["trechos"]["ida"] = []
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "trechos.ida" in error_fields(r)

    def test_retorno_ausente(self):
        p = make_payload()
        p["trechos"]["retorno"] = []
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "trechos.retorno" in error_fields(r)

    def test_ida_sem_data_hora(self):
        p = make_payload()
        p["trechos"]["ida"][0]["data_hora"] = ""
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "trechos.ida" in error_fields(r)

    def test_retorno_anterior_a_ida(self):
        p = make_payload()
        p["trechos"]["retorno"][0]["data_hora"] = "2026-05-19T08:00"
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "trechos" in error_fields(r)

    def test_retorno_igual_a_ida_invalido(self):
        # Retorno exatamente no mesmo momento da ida não faz sentido
        p = make_payload()
        p["trechos"]["retorno"][0]["data_hora"] = "2026-05-20T08:00"
        p["missao"]["inicio_data_hora"] = "2026-05-20T08:00"
        p["missao"]["termino_data_hora"] = "2026-05-20T08:00"
        r = validate_and_enrich_anexo1(p)
        # Não deve ser bloqueado pela regra ret < ida (igual não é menor)
        assert "trechos" not in error_fields(r)

    def test_trecho_normaliza_dict_para_lista(self):
        p = make_payload()
        p["trechos"]["ida"] = {"origem": "João Pessoa", "destino": "Recife", "data_hora": "2026-05-20T08:00"}
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is True

    def test_multiplos_trechos_encadeados_corretos(self):
        p = make_payload()
        p["trechos"]["ida"] = [
            {"origem": "João Pessoa", "destino": "Recife", "data_hora": "2026-05-20T08:00"},
            {"origem": "Recife", "destino": "Fortaleza", "data_hora": "2026-05-20T14:00"},
        ]
        p["trechos"]["retorno"] = [
            {"origem": "Fortaleza", "destino": "João Pessoa", "data_hora": "2026-05-22T18:00"},
        ]
        p["missao"]["inicio_data_hora"] = "2026-05-20T09:00"
        p["missao"]["termino_data_hora"] = "2026-05-22T17:00"
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is True

    def test_multiplos_trechos_encadeamento_quebrado(self):
        p = make_payload()
        p["trechos"]["ida"] = [
            {"origem": "João Pessoa", "destino": "Recife", "data_hora": "2026-05-20T08:00"},
            {"origem": "Natal", "destino": "Fortaleza", "data_hora": "2026-05-20T14:00"},  # origem errada
        ]
        p["trechos"]["retorno"] = [
            {"origem": "Fortaleza", "destino": "João Pessoa", "data_hora": "2026-05-22T18:00"},
        ]
        p["missao"]["inicio_data_hora"] = "2026-05-20T09:00"
        p["missao"]["termino_data_hora"] = "2026-05-22T17:00"
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "trechos.ida.1.origem" in error_fields(r)

    def test_destino_ida_diferente_da_origem_retorno(self):
        p = make_payload()
        p["trechos"]["retorno"][0]["origem"] = "Natal"  # deveria ser "Recife"
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "trechos.retorno.0.origem" in error_fields(r)


class TestMesmaCidade:
    def test_origem_igual_destino_ida(self):
        p = make_payload()
        p["trechos"]["ida"][0]["destino"] = "joão pessoa"  # mesma cidade (case insensitive)
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "trechos.ida.0.destino" in error_fields(r)

    def test_origem_igual_destino_retorno(self):
        p = make_payload()
        p["trechos"]["retorno"][0]["destino"] = "recife"
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "trechos.retorno.0.destino" in error_fields(r)

    def test_cidades_diferentes_case_insensitive_ok(self):
        p = make_payload()
        p["trechos"]["ida"][0]["origem"] = "JOÃO PESSOA"
        p["trechos"]["ida"][0]["destino"] = "recife"
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is True


class TestMissao:
    def test_termino_anterior_ao_inicio(self):
        p = make_payload()
        p["missao"]["termino_data_hora"] = "2026-05-19T08:00"
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "missao" in error_fields(r)

    def test_inicio_anterior_a_ida(self):
        p = make_payload()
        p["missao"]["inicio_data_hora"] = "2026-05-19T08:00"  # antes da ida (20/05)
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "missao" in error_fields(r)

    def test_termino_posterior_ao_retorno(self):
        p = make_payload()
        p["missao"]["termino_data_hora"] = "2026-05-23T08:00"  # após retorno (22/05)
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "missao" in error_fields(r)

    def test_missao_ausente_gera_erro(self):
        p = make_payload()
        del p["missao"]
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert "missao" in error_fields(r)


class TestFlagsEPrazo:
    def test_dentro_do_prazo_diarias(self):
        # prazo = 10 dias; ida=20/05 → limite=10/05; solicitacao=10/05 → não ultrapassa
        p = make_payload(data_solicitacao="2026-05-10")
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is True
        assert r["flags"]["fora_do_prazo"] is False

    def test_fora_do_prazo_diarias(self):
        # prazo = 10 dias; ida=20/05, solicitacao=12/05 → fora do prazo (limite=10/05)
        p = make_payload(data_solicitacao="2026-05-12")
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert r["flags"]["fora_do_prazo"] is True
        assert "justificativas.justificativa_fora_prazo" in error_fields(r)

    def test_fora_do_prazo_com_justificativa_ok(self):
        p = make_payload(
            data_solicitacao="2026-05-12",
            justificativas={"justificativa_fora_prazo": "Urgência administrativa devidamente documentada."},
        )
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is True
        assert r["flags"]["fora_do_prazo"] is True

    def test_prazo_passagens_30_dias(self):
        # ida=20/05; com passagens → prazo 30 dias → limite=20/04
        # solicitacao=21/04 → fora do prazo
        p = make_payload(tipo_solicitacao="passagens", data_solicitacao="2026-04-21")
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert r["flags"]["fora_do_prazo"] is True

    def test_prazo_passagens_dentro(self):
        # limite = 20/05 - 30 = 20/04; solicitacao = 20/04 → exatamente no limite → NOT fora
        p = make_payload(tipo_solicitacao="passagens", data_solicitacao="2026-04-20")
        r = validate_and_enrich_anexo1(p)
        assert r["flags"]["fora_do_prazo"] is False

    def test_fora_do_prazo_flag_sempre_sobrescreve(self):
        # Mesmo que payload envie flags["fora_do_prazo"]=False, o backend recalcula
        p = make_payload(data_solicitacao="2026-05-12", flags={"fora_do_prazo": False})
        r = validate_and_enrich_anexo1(p)
        assert r["flags"]["fora_do_prazo"] is True


class TestFimDeSemana:
    def test_ida_sabado_exige_justificativa(self):
        # 2026-05-23 = sábado
        p = make_payload(data_solicitacao="2026-05-14")
        p["trechos"]["ida"][0]["data_hora"] = "2026-05-23T08:00"
        p["trechos"]["retorno"][0]["data_hora"] = "2026-05-25T18:00"
        p["missao"]["inicio_data_hora"] = "2026-05-23T09:00"
        p["missao"]["termino_data_hora"] = "2026-05-25T17:00"
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert r["flags"]["envolve_fds_feriado_ou_dia_anterior"] is True
        assert "justificativas.justificativa_fds_feriado_dia_anterior" in error_fields(r)

    def test_ida_domingo_exige_justificativa(self):
        # 2026-05-24 = domingo
        p = make_payload(data_solicitacao="2026-05-15")
        p["trechos"]["ida"][0]["data_hora"] = "2026-05-24T08:00"
        p["trechos"]["retorno"][0]["data_hora"] = "2026-05-26T18:00"
        p["missao"]["inicio_data_hora"] = "2026-05-24T09:00"
        p["missao"]["termino_data_hora"] = "2026-05-26T17:00"
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is False
        assert r["flags"]["envolve_fds_feriado_ou_dia_anterior"] is True

    def test_ida_sabado_com_justificativa_ok(self):
        # ida=23/05 (sáb) → limite prazo=13/05; data_solic=13/05 → dentro do prazo
        p = make_payload(
            data_solicitacao="2026-05-13",
            justificativas={"justificativa_fds_feriado_dia_anterior": "Evento realizado no fim de semana."},
        )
        p["trechos"]["ida"][0]["data_hora"] = "2026-05-23T08:00"
        p["trechos"]["retorno"][0]["data_hora"] = "2026-05-25T18:00"
        p["missao"]["inicio_data_hora"] = "2026-05-23T09:00"
        p["missao"]["termino_data_hora"] = "2026-05-25T17:00"
        r = validate_and_enrich_anexo1(p)
        assert r["ok"] is True

    def test_ida_terca_sem_fds(self):
        # 2026-05-20 = terça-feira
        r = validate_and_enrich_anexo1(make_payload())
        assert r["flags"]["envolve_fds_feriado_ou_dia_anterior"] is False

    def test_flag_fds_nao_pode_ser_bypassada_pelo_usuario(self):
        # Mesmo que o payload envie flag=False, o backend recalcula e sobrescreve
        p = make_payload(
            data_solicitacao="2026-05-13",
            flags={"envolve_fds_feriado_ou_dia_anterior": False},
        )
        p["trechos"]["ida"][0]["data_hora"] = "2026-05-23T08:00"  # sábado
        p["trechos"]["retorno"][0]["data_hora"] = "2026-05-25T18:00"
        p["missao"]["inicio_data_hora"] = "2026-05-23T09:00"
        p["missao"]["termino_data_hora"] = "2026-05-25T17:00"
        r = validate_and_enrich_anexo1(p)
        assert r["flags"]["envolve_fds_feriado_ou_dia_anterior"] is True
        assert r["ok"] is False
        assert "justificativas.justificativa_fds_feriado_dia_anterior" in error_fields(r)


class TestRetornoOk:
    def test_payload_valido_retorna_ok_true(self):
        r = validate_and_enrich_anexo1(make_payload())
        assert r["ok"] is True
        assert "flags" in r
        assert "placeholders" in r
        assert "rows" in r

    def test_flags_presentes_no_resultado(self):
        r = validate_and_enrich_anexo1(make_payload())
        assert "fora_do_prazo" in r["flags"]
        assert "envolve_fds_feriado_ou_dia_anterior" in r["flags"]
