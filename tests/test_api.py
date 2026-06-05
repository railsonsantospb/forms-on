"""Testes de integração para a API FastAPI."""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


# ---------------------------------------------------------------------------
# Payloads válidos
# ---------------------------------------------------------------------------
PAYLOAD_ANEXO1 = {
    "tipo_solicitacao": "diarias",
    "data_solicitacao": "2026-05-01",
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
        "dados_bancarios": {"banco": "001", "agencia": "0001", "conta": "12345"},
        "tipo_vinculo": "servidor",
    },
    "motivo_viagem": "Participação em congresso internacional de pesquisa científica",
    "trechos": {
        "ida": [
            {"origem": "João Pessoa", "destino": "Recife", "data_hora": "2026-05-20T08:00"}
        ],
        "retorno": [
            {"origem": "Recife", "destino": "João Pessoa", "data_hora": "2026-05-22T18:00"}
        ],
    },
    "missao": {
        "inicio_data_hora": "2026-05-20T09:00",
        "termino_data_hora": "2026-05-22T17:00",
    },
    "debito_recurso": {"tipo": "projeto", "detalhe": "Projeto X"},
    "transporte": {"meios": ["veiculo_oficial"]},
    "relacao_pertinencia": "Relação de pertinência de exemplo para a missão.",
    "flags": {},
}

PAYLOAD_ANEXO2 = {
    "data_relatorio": "2026-05-23",
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
        "ida": [
            {"origem": "João Pessoa / PB", "destino": "Recife / PE", "data_hora": "2026-05-20T08:00"}
        ],
        "retorno": [
            {"origem": "Recife / PE", "destino": "João Pessoa / PB", "data_hora": "2026-05-22T18:00"}
        ],
    },
    "atividades_tabela": [{"data": "2026-05-20", "atividades": "Reunião"}],
    "viagem_realizada": "sim",
    "flags": {},
}


# ---------------------------------------------------------------------------
# Rotas HTML
# ---------------------------------------------------------------------------
class TestHtmlRoutes:
    def test_home(self):
        r = client.get("/")
        assert r.status_code == 200
        assert "text/html" in r.headers["content-type"]

    def test_anexo1_page(self):
        r = client.get("/anexo1")
        assert r.status_code == 200
        assert "text/html" in r.headers["content-type"]

    def test_anexo2_page(self):
        r = client.get("/anexo2")
        assert r.status_code == 200
        assert "text/html" in r.headers["content-type"]

    def test_review_page(self):
        r = client.get("/review")
        assert r.status_code == 200
        assert "text/html" in r.headers["content-type"]
        assert len(r.content) > 0

    def test_404_page(self):
        r = client.get("/pagina-que-nao-existe")
        assert r.status_code == 200  # SPA fallback
        assert "text/html" in r.headers["content-type"]

    def test_path_traversal_blocked(self):
        r = client.get("/..%2f..%2fetc%2fpasswd")
        assert r.status_code == 404

    def test_system_probe_blocked(self):
        r = client.get("/etc/passwd")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# API Auxiliar
# ---------------------------------------------------------------------------
class TestServerDate:
    def test_server_date(self):
        r = client.get("/api/server-date")
        assert r.status_code == 200
        assert "date" in r.json()


# ---------------------------------------------------------------------------
# Drafts
# ---------------------------------------------------------------------------
class TestDrafts:
    def test_create_draft_anexo1(self):
        r = client.post("/api/drafts?kind=anexo1")
        assert r.status_code == 200
        data = r.json()
        assert "draft_id" in data
        assert "draft_token" in data

    def test_create_draft_anexo2(self):
        r = client.post("/api/drafts?kind=anexo2")
        assert r.status_code == 200
        data = r.json()
        assert "draft_id" in data
        assert "draft_token" in data

    def test_create_draft_invalid_kind(self):
        r = client.post("/api/drafts?kind=invalido")
        assert r.status_code == 422

    def test_get_draft_without_token(self):
        create = client.post("/api/drafts?kind=anexo1")
        draft_id = create.json()["draft_id"]
        r = client.get(f"/api/drafts/{draft_id}")
        assert r.status_code == 403
        assert "Token" in r.json()["detail"]

    def test_get_draft_with_wrong_token(self):
        create = client.post("/api/drafts?kind=anexo1")
        draft_id = create.json()["draft_id"]
        r = client.get(f"/api/drafts/{draft_id}", headers={"x-draft-token": "wrong-token"})
        assert r.status_code == 403
        assert "inválido" in r.json()["detail"]

    def test_get_draft_success(self):
        create = client.post("/api/drafts?kind=anexo1")
        data = create.json()
        r = client.get(f"/api/drafts/{data['draft_id']}", headers={"x-draft-token": data["draft_token"]})
        assert r.status_code == 200
        assert r.json()["kind"] == "anexo1"

    def test_patch_draft(self):
        create = client.post("/api/drafts?kind=anexo1")
        data = create.json()
        r = client.patch(
            f"/api/drafts/{data['draft_id']}",
            headers={"x-draft-token": data["draft_token"]},
            json={"campo_teste": "valor"},
        )
        assert r.status_code == 200
        assert r.json()["ok"] is True

        # Verify patch persisted
        r2 = client.get(f"/api/drafts/{data['draft_id']}", headers={"x-draft-token": data["draft_token"]})
        assert r2.json()["data"]["campo_teste"] == "valor"

    def test_invalid_draft_id(self):
        r = client.get("/api/drafts/invalid-id")
        assert r.status_code == 400

    def test_draft_not_found(self):
        r = client.get("/api/drafts/12345678-1234-1234-1234-123456789abc", headers={"x-draft-token": "token"})
        assert r.status_code == 404

    def test_delete_not_allowed(self):
        r = client.delete("/api/drafts/test")
        assert r.status_code == 405


# ---------------------------------------------------------------------------
# Preview
# ---------------------------------------------------------------------------
class TestPreview:
    def test_preview_anexo1_valid(self):
        r = client.post("/api/anexo1/preview", json=PAYLOAD_ANEXO1)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_preview_anexo1_invalid(self):
        r = client.post("/api/anexo1/preview", json={})
        assert r.status_code == 422
        assert "Dados inválidos" in r.json()["detail"]

    def test_preview_anexo2_valid(self):
        r = client.post("/api/anexo2/preview", json=PAYLOAD_ANEXO2)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_preview_anexo2_invalid(self):
        r = client.post("/api/anexo2/preview", json={})
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Generate DOCX
# ---------------------------------------------------------------------------
class TestGenerateDocx:
    def test_generate_anexo1_docx(self):
        r = client.post("/api/anexo1/generate?format=docx", json=PAYLOAD_ANEXO1)
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    def test_generate_anexo2_docx(self):
        r = client.post("/api/anexo2/generate?format=docx", json=PAYLOAD_ANEXO2)
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    def test_generate_anexo1_invalid_payload(self):
        r = client.post("/api/anexo1/generate?format=docx", json={})
        assert r.status_code == 422

    def test_generate_anexo2_invalid_payload(self):
        r = client.post("/api/anexo2/generate?format=docx", json={})
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Generate PDF (sem LibreOffice deve retornar 503)
# ---------------------------------------------------------------------------
class TestGeneratePdf:
    def test_generate_anexo1_pdf_no_libreoffice(self):
        r = client.post("/api/anexo1/generate?format=pdf", json=PAYLOAD_ANEXO1)
        assert r.status_code == 503
        assert "LibreOffice" in r.json()["detail"]

    def test_generate_anexo2_pdf_no_libreoffice(self):
        r = client.post("/api/anexo2/generate?format=pdf", json=PAYLOAD_ANEXO2)
        assert r.status_code == 503
        assert "LibreOffice" in r.json()["detail"]


# ---------------------------------------------------------------------------
# Prefill (upload)
# ---------------------------------------------------------------------------
class TestPrefill:
    def test_prefill_anexo1_no_file(self):
        r = client.post("/api/anexo1/prefill-from-anexo1")
        assert r.status_code == 422

    def test_prefill_anexo2_from_anexo1_no_file(self):
        r = client.post("/api/anexo2/prefill-from-anexo1")
        assert r.status_code == 422

    def test_prefill_anexo2_from_anexo2_no_file(self):
        r = client.post("/api/anexo2/prefill-from-anexo2")
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Segurança
# ---------------------------------------------------------------------------
class TestSecurity:
    def test_security_headers_present(self):
        r = client.get("/")
        headers = r.headers
        assert headers["x-content-type-options"] == "nosniff"
        assert headers["x-frame-options"] == "DENY"
        assert "content-security-policy" in headers

    def test_docs_blocked(self):
        r = client.get("/docs")
        assert r.status_code == 404

    def test_openapi_blocked(self):
        r = client.get("/openapi.json")
        assert r.status_code == 404
