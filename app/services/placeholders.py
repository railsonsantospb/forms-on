from __future__ import annotations

from datetime import datetime, date, timezone
from typing import Any, Dict


def _fmt_date(s: str) -> str:
    d = date.fromisoformat(s)
    return d.strftime("%d/%m/%Y")


def _fmt_dt(s: str) -> str:
    dt = datetime.fromisoformat(s)
    return dt.strftime("%d/%m/%Y %H:%M")


def _fmt_dt_opt(s: str | None) -> str:
    if not s:
        return ""
    try:
        return _fmt_dt(s)
    except Exception:
        return ""


def _fmt_date_from_dt(s: str | None) -> str:
    if not s:
        return ""
    try:
        dt = datetime.fromisoformat(s)
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return ""


def _fmt_time_from_dt(s: str | None) -> str:
    if not s:
        return ""
    try:
        dt = datetime.fromisoformat(s)
        return dt.strftime("%H:%M")
    except Exception:
        return ""


def _normalize_trechos(value: Any) -> list[dict]:
    if isinstance(value, list):
        return [v for v in value if isinstance(v, dict)]
    if isinstance(value, dict):
        return [value]
    return []


def _x(flag: bool) -> str:
    return "X" if flag else ""


def _fmt_data_extenso(d: date) -> str:
    meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ]
    return f"{d.day} de {meses[d.month - 1]} de {d.year}"


def build_placeholders_anexo1(payload: Dict[str, Any], flags: Dict[str, Any]) -> Dict[str, str]:
    tipo = payload["tipo_solicitacao"]
    servidor = payload["servidor"]
    trechos = payload["trechos"]
    missao = payload["missao"]
    deb = payload["debito_recurso"]
    transp = payload["transporte"]
    just = payload.get("justificativas") or {}

    meios = set(transp.get("meios", []))

    # débito do recurso
    deb_tipo = deb["tipo"]
    deb_det = (deb.get("detalhe") or "").strip()

    # tipo de vínculo
    tipo_vinculo = servidor.get("tipo_vinculo") or "servidor"
    aux_transp = servidor.get("auxilio_transporte") or {}
    aux_alim = servidor.get("auxilio_alimentacao") or {}

    # trechos ida/retorno (primeiro trecho para placeholders principais)
    ida_list = _normalize_trechos(trechos.get("ida"))
    ret_list = _normalize_trechos(trechos.get("retorno"))
    ida_first = ida_list[0] if ida_list else {}
    ret_first = ret_list[0] if ret_list else {}

    ph = {
        "data_solicitacao": _fmt_date(payload["data_solicitacao"]),

        "chk_diarias": _x(tipo in ("diarias", "diarias_e_passagens")),
        "chk_passagens": _x(tipo in ("passagens", "diarias_e_passagens")),

        "chk_vinculo_servidor": _x(tipo_vinculo == "servidor"),
        "chk_vinculo_nao_servidor": _x(tipo_vinculo == "nao_servidor"),
        "chk_vinculo_sepe": _x(tipo_vinculo == "sepe"),
        "chk_vinculo_acompanhante_pcd": _x(tipo_vinculo == "acompanhante_pcd"),
        "chk_vinculo_outro": _x(tipo_vinculo == "outro"),
        "vinculo_outro_especificar": servidor.get("vinculo_outro_especificar") or "",

        "chk_auxilio_transporte_sim": _x(aux_transp.get("recebe") is True),
        "chk_auxilio_transporte_nao": _x(aux_transp.get("recebe") is not True),
        "auxilio_transporte_valor": (aux_transp.get("valor") or ""),

        "chk_auxilio_alimentacao_sim": _x(aux_alim.get("recebe") is True),
        "chk_auxilio_alimentacao_nao": _x(aux_alim.get("recebe") is not True),
        "auxilio_alimentacao_valor": (aux_alim.get("valor") or ""),

        "nome_completo": servidor["nome_completo"],
        "cargo_funcao": servidor["cargo_funcao"],
        "cpf": servidor["cpf"],
        "rg": servidor["rg"],
        "passaporte": servidor.get("passaporte") or "",
        "lotacao_orgao": servidor.get("lotacao_orgao") or "",
        "data_nascimento": _fmt_date(servidor["data_nascimento"]),
        "siape": servidor["siape"],
        "nome_mae": servidor["nome_mae"],
        "endereco": servidor["endereco"],
        "telefone": servidor["telefone"],
        "email": servidor["email"],
        "banco": servidor["dados_bancarios"]["banco"],
        "agencia": servidor["dados_bancarios"]["agencia"],
        "conta": servidor["dados_bancarios"]["conta"],

        "motivo_viagem": payload["motivo_viagem"],
        "relacao_pertinencia": payload.get("relacao_pertinencia") or "",

        # Primeiro trecho (para placeholders diretos no template)
        "ida_origem": ida_first.get("origem") or "",
        "ida_destino": ida_first.get("destino") or "",
        "ida_data": _fmt_date_from_dt(ida_first.get("data_hora")),
        "ida_hora": _fmt_time_from_dt(ida_first.get("data_hora")),

        "retorno_origem": ret_first.get("origem") or "",
        "retorno_destino": ret_first.get("destino") or "",
        "retorno_data": _fmt_date_from_dt(ret_first.get("data_hora")),
        "retorno_hora": _fmt_time_from_dt(ret_first.get("data_hora")),

        "missao_inicio_data_hora": _fmt_dt(missao["inicio_data_hora"]),
        "missao_termino_data_hora": _fmt_dt(missao["termino_data_hora"]),

        "chk_recurso_cchsa": _x(deb_tipo == "cchsa"),
        "chk_recurso_cavn": _x(deb_tipo == "cavn"),
        "chk_recurso_projeto": _x(deb_tipo == "projeto"),
        "chk_recurso_outros": _x(deb_tipo == "outros"),
        "recurso_projeto": deb_det if deb_tipo == "projeto" else "",
        "recurso_outros": deb_det if deb_tipo == "outros" else "",

        "chk_transporte_veiculo_oficial": _x("veiculo_oficial" in meios),
        "chk_transporte_empresa_terrestre": _x("empresa_terrestre" in meios),
        "chk_transporte_empresa_aerea": _x("empresa_aerea" in meios),
        "chk_transporte_veiculo_proprio": _x("veiculo_proprio" in meios),
        "distancia_km": transp.get("distancia_km") or "",

        "just_viagem_urgente": just.get("just_viagem_urgente") or "",
        "just_fds_feriado": just.get("just_fds_feriado") or "",
        "just_aeroporto": just.get("just_aeroporto") or "",
        "just_grupo_mais_2": just.get("just_grupo_mais_2") or "",
        "just_grupo_mais_5": just.get("just_grupo_mais_5") or "",
        "just_mais_30_diarias": just.get("just_mais_30_diarias") or "",
        "data_emissao_documento": _fmt_data_extenso(date.today()),
    }
    # garantir string
    return {k: ("" if v is None else str(v)) for k, v in ph.items()}


def build_rows_anexo1(trechos: Dict[str, Any]) -> Dict[str, list]:
    """Constroi rows para expansão dinâmica de trechos no template."""
    ida_list = _normalize_trechos(trechos.get("ida"))
    ret_list = _normalize_trechos(trechos.get("retorno"))

    ida_rows = [
        {
            "ida_origem": t.get("origem") or "",
            "ida_destino": t.get("destino") or "",
            "ida_data": _fmt_date_from_dt(t.get("data_hora")),
            "ida_hora": _fmt_time_from_dt(t.get("data_hora")),
        }
        for t in ida_list
    ]
    ret_rows = [
        {
            "retorno_origem": t.get("origem") or "",
            "retorno_destino": t.get("destino") or "",
            "retorno_data": _fmt_date_from_dt(t.get("data_hora")),
            "retorno_hora": _fmt_time_from_dt(t.get("data_hora")),
        }
        for t in ret_list
    ]
    return {"ida": ida_rows, "retorno": ret_rows}


def build_placeholders_anexo2(payload: Dict[str, Any], flags: Dict[str, Any]) -> Dict[str, str]:
    proposto = payload["proposto"]
    orgao = proposto["orgao"]
    afast = payload["afastamento"]

    org_tipo = orgao["tipo"]
    det = (orgao.get("detalhe") or "").strip()

    ph = {
        "data_relatorio": _fmt_date(payload["data_relatorio"]),

        "nome": proposto["nome"],
        "cpf": proposto["cpf"],
        "siape": proposto["siape"],
        "cargo_funcao": proposto.get("cargo_funcao") or "",
        "telefone": proposto.get("telefone") or "",
        "email": proposto.get("email") or "",

        "chk_orgao_cchsa": _x(org_tipo == "cchsa"),
        "chk_orgao_cavn": _x(org_tipo == "cavn"),
        "chk_orgao_projetos": _x(org_tipo == "projetos"),
        "chk_orgao_outros": _x(org_tipo == "outros"),
        "orgao_projetos": det if org_tipo == "projetos" else "",
        "orgao_outros": det if org_tipo == "outros" else "",

        "ida_origem": "\n".join((t.get("origem") or "") for t in _normalize_trechos(afast.get("ida"))),
        "ida_destino": "\n".join((t.get("destino") or "") for t in _normalize_trechos(afast.get("ida"))),
        "ida_data_hora": "\n".join(_fmt_dt_opt(t.get("data_hora")) for t in _normalize_trechos(afast.get("ida"))),

        "retorno_origem": "\n".join((t.get("origem") or "") for t in _normalize_trechos(afast.get("retorno"))),
        "retorno_destino": "\n".join((t.get("destino") or "") for t in _normalize_trechos(afast.get("retorno"))),
        "retorno_data_hora": "\n".join(_fmt_dt_opt(t.get("data_hora")) for t in _normalize_trechos(afast.get("retorno"))),

        "alteracoes_cancelamentos_noshow": payload.get("alteracoes_cancelamentos_noshow") or "",

        "justificativa_prestacao_contas_fora_prazo": (payload.get("justificativa_prestacao_contas_fora_prazo") or "") if flags.get("prestacao_contas_fora_prazo") else "",

        "chk_viagem_realizada_sim": _x(payload.get("viagem_realizada") == "sim"),
        "chk_viagem_realizada_nao": _x(payload.get("viagem_realizada") == "nao"),
    }
    return {k: ("" if v is None else str(v)) for k, v in ph.items()}


def build_rows_anexo2(afastamento: Dict[str, Any]) -> Dict[str, list]:
    """Constroi rows para expansão dinâmica de trechos no Anexo II."""
    ida_list = _normalize_trechos(afastamento.get("ida"))
    ret_list = _normalize_trechos(afastamento.get("retorno"))

    ida_rows = [
        {
            "ida_origem": t.get("origem") or "",
            "ida_destino": t.get("destino") or "",
            "ida_data_hora": _fmt_dt_opt(t.get("data_hora")),
        }
        for t in ida_list
    ]
    ret_rows = [
        {
            "retorno_origem": t.get("origem") or "",
            "retorno_destino": t.get("destino") or "",
            "retorno_data_hora": _fmt_dt_opt(t.get("data_hora")),
        }
        for t in ret_list
    ]
    return {"ida": ida_rows, "retorno": ret_rows}


def build_atividades_rows(payload: Dict[str, Any]) -> list[dict]:
    """Constroi rows para expansão da tabela de atividades do Anexo II."""
    atividades = payload.get("atividades_tabela") or []
    rows = []
    for atv in atividades:
        rows.append({
            "atv_data": atv.get("data") or "",
            "atv_horario": atv.get("horario") or "",
            "atv_cidade": atv.get("cidade") or "",
            "atv_atividades": atv.get("atividades") or "",
        })
    return rows


def build_alteracoes_rows(payload: Dict[str, Any]) -> list[dict]:
    """Constroi rows para expansão da tabela de alterações/cancelamentos/no show do Anexo II."""
    alteracoes = payload.get("alteracoes_cancelamentos_noshow") or []
    rows = []
    for alt in alteracoes:
        if not isinstance(alt, dict):
            continue
        tipo = (alt.get("tipo") or "").strip()
        descricao = (alt.get("descricao") or "").strip()
        if tipo or descricao:
            rows.append({
                "alt_tipo": tipo,
                "alt_descricao": descricao,
            })
    return rows
