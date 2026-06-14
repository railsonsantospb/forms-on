from __future__ import annotations

from datetime import datetime, date, timedelta
from typing import Any, Dict

from app.settings import settings
from app.services.placeholders import (
    build_placeholders_anexo2,
    build_rows_anexo2,
    build_atividades_rows,
    build_alteracoes_rows,
)


def _parse_date(s: str) -> date:
    return date.fromisoformat(s)


def _parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s)


def _normalize_trecho_list(value: Any) -> list[Dict[str, Any]]:
    if isinstance(value, list):
        return [v for v in value if isinstance(v, dict)]
    if isinstance(value, dict):
        return [value]
    return []


def _fmt_dt_opt(value: Any) -> str:
    if not value:
        return ""
    try:
        return datetime.fromisoformat(value).strftime("%d/%m/%Y %H:%M")
    except Exception:
        return ""


def validate_and_enrich_anexo2(payload: Dict[str, Any]) -> Dict[str, Any]:
    errors = []

    # campos obrigatórios do proposto
    proposto = payload.get("proposto") or {}
    if not (proposto.get("cargo_funcao") or "").strip():
        errors.append(
            {"field": "proposto.cargo_funcao", "message": "Informe o cargo/função."}
        )
    if not (proposto.get("telefone") or "").strip():
        errors.append({"field": "proposto.telefone", "message": "Informe o telefone."})
    if not (proposto.get("email") or "").strip():
        errors.append({"field": "proposto.email", "message": "Informe o e-mail."})

    # datas ida/retorno
    try:
        afast = payload.get("afastamento") or {}
        ida_list = _normalize_trecho_list(afast.get("ida"))
        ret_list = _normalize_trecho_list(afast.get("retorno"))
        payload["afastamento"] = {"ida": ida_list, "retorno": ret_list}

        if not ida_list:
            errors.append(
                {
                    "field": "afastamento.ida",
                    "message": "Informe ao menos um trecho de ida.",
                }
            )
        if not ret_list:
            errors.append(
                {
                    "field": "afastamento.retorno",
                    "message": "Informe ao menos um trecho de retorno.",
                }
            )
        for t in ida_list:
            if not t.get("data_hora"):
                errors.append(
                    {
                        "field": "afastamento.ida",
                        "message": "Informe datas/horas válidas para todos os trechos de ida.",
                    }
                )
                break
        for t in ret_list:
            if not t.get("data_hora"):
                errors.append(
                    {
                        "field": "afastamento.retorno",
                        "message": "Informe datas/horas válidas para todos os trechos de retorno.",
                    }
                )
                break

        ida = _parse_dt(ida_list[0]["data_hora"]) if ida_list else None
        ret = _parse_dt(ret_list[-1]["data_hora"]) if ret_list else None
        if ida and ret and ret < ida:
            errors.append(
                {
                    "field": "afastamento",
                    "message": "A data/hora de retorno não pode ser anterior à ida.",
                }
            )
    except Exception:
        errors.append(
            {
                "field": "afastamento",
                "message": "Informe datas/horas válidas para ida e retorno.",
            }
        )
        ida = ret = None

    # Normaliza alteracoes_cancelamentos_noshow (protege contra string de versão antiga)
    alt_raw = payload.get("alteracoes_cancelamentos_noshow")
    if isinstance(alt_raw, list):
        payload["alteracoes_cancelamentos_noshow"] = [
            a for a in alt_raw if isinstance(a, dict)
        ]
    else:
        payload["alteracoes_cancelamentos_noshow"] = []

    # fora do prazo: retorno + 5 dias
    flags = payload.get("flags") or {}
    dr = payload.get("data_relatorio")
    if ret and dr:
        data_rel = _parse_date(dr)
        limite = ret.date() + timedelta(days=settings.prazo_relatorio_dias)
        flags["prestacao_contas_fora_prazo"] = data_rel > limite
    else:
        flags.setdefault("prestacao_contas_fora_prazo", False)

    # atividades_tabela: pelo menos uma linha com atividades preenchida
    atv_tabela = payload.get("atividades_tabela") or []
    if not atv_tabela:
        errors.append(
            {
                "field": "atividades_tabela",
                "message": "Adicione pelo menos uma linha na tabela de atividades.",
            }
        )
    else:
        tem_atividade_valida = any(
            isinstance(item, dict) and (item.get("atividades") or "").strip()
            for item in atv_tabela
        )
        if not tem_atividade_valida:
            errors.append(
                {
                    "field": "atividades_tabela",
                    "message": "Preencha a descrição das atividades em pelo menos uma linha da tabela.",
                }
            )

    # === REGRAS DE CIDADE ===
    def _norm_cidade(s: str | None) -> str:
        return (s or "").strip().lower()

    for i, t in enumerate(ida_list):
        if _norm_cidade(t.get("origem")) == _norm_cidade(t.get("destino")):
            errors.append(
                {
                    "field": f"afastamento.ida.{i}.destino",
                    "message": "A origem e o destino não podem ser a mesma cidade.",
                }
            )
    for i, t in enumerate(ret_list):
        if _norm_cidade(t.get("origem")) == _norm_cidade(t.get("destino")):
            errors.append(
                {
                    "field": f"afastamento.retorno.{i}.destino",
                    "message": "A origem e o destino não podem ser a mesma cidade.",
                }
            )

    for i in range(len(ida_list) - 1):
        if _norm_cidade(ida_list[i].get("destino")) != _norm_cidade(
            ida_list[i + 1].get("origem")
        ):
            errors.append(
                {
                    "field": f"afastamento.ida.{i + 1}.origem",
                    "message": f"O destino do trecho {i + 1} deve ser a origem do trecho {i + 2}.",
                }
            )
    for i in range(len(ret_list) - 1):
        if _norm_cidade(ret_list[i].get("destino")) != _norm_cidade(
            ret_list[i + 1].get("origem")
        ):
            errors.append(
                {
                    "field": f"afastamento.retorno.{i + 1}.origem",
                    "message": f"O destino do trecho {i + 1} deve ser a origem do trecho {i + 2}.",
                }
            )

    if ida_list and ret_list:
        if _norm_cidade(ida_list[-1].get("destino")) != _norm_cidade(
            ret_list[0].get("origem")
        ):
            errors.append(
                {
                    "field": "afastamento.retorno.0.origem",
                    "message": "O destino da ida deve ser o mesmo que a origem do retorno.",
                }
            )

    if flags.get("prestacao_contas_fora_prazo"):
        if not (payload.get("justificativa_prestacao_contas_fora_prazo") or "").strip():
            errors.append(
                {
                    "field": "justificativa_prestacao_contas_fora_prazo",
                    "message": "Prestação de contas fora do prazo. Informe a justificativa.",
                }
            )

    if errors:
        return {"ok": False, "errors": errors, "flags": flags}

    placeholders = build_placeholders_anexo2(payload, flags)
    rows = build_rows_anexo2(payload["afastamento"])
    atividades_rows = build_atividades_rows(payload)
    alteracoes_rows = build_alteracoes_rows(payload)
    return {
        "ok": True,
        "flags": flags,
        "placeholders": placeholders,
        "rows": rows,
        "atividades_rows": atividades_rows,
        "alteracoes_rows": alteracoes_rows,
    }
