from __future__ import annotations

import re
from dataclasses import dataclass

from pathlib import Path
from typing import Any, Dict, List, Optional

from app.services.anexo1_import import (
    _extract_text,
    _is_checked,
    _parse_br_date,
    _parse_br_datetime,
    clean,
    find_block,
    find_one,
    find_with_stop,
)


def parse_orgao_exercicio(text: str) -> Dict[str, Optional[str]]:
    """Parse Órgão de Exercício checkboxes from Anexo II."""
    block = find_block(r"ÓRGÃO DE EXERCÍCIO:\s*", r"IDENTIFICAÇÃO DO AFASTAMENTO", text) or ""
    if not block:
        # Fallback: looser match
        block = find_block(r"Órgão de Exercício\s*", r"IDENTIFICAÇÃO DO AFASTAMENTO", text) or ""

    if _is_checked(block, r"CCHSA\b"):
        return {"tipo": "cchsa"}
    if _is_checked(block, r"CAVN\b"):
        return {"tipo": "cavn"}
    if _is_checked(block, r"PROJETOS\b"):
        detalhe = find_one(r"PROJETOS\s+(.+?)(?:\n|$)", block) or ""
        return {"tipo": "projetos", "detalhe": detalhe.strip() or None}
    if _is_checked(block, r"OUTROS:\b"):
        detalhe = find_one(r"OUTROS:\s*(.+?)(?:\n|$)", block) or ""
        return {"tipo": "outros", "detalhe": detalhe.strip() or None}

    # Try without checkbox markers — look for bold/filled values
    m = re.search(r"CCHSA", block, re.IGNORECASE)
    if m:
        return {"tipo": "cchsa"}
    m = re.search(r"CAVN", block, re.IGNORECASE)
    if m:
        return {"tipo": "cavn"}
    m = re.search(r"PROJETOS\s+(.+?)(?:\n|$)", block, re.IGNORECASE)
    if m:
        return {"tipo": "projetos", "detalhe": m.group(1).strip() or None}
    m = re.search(r"OUTROS:\s*(.+?)(?:\n|$)", block, re.IGNORECASE)
    if m:
        return {"tipo": "outros", "detalhe": m.group(1).strip() or None}

    return {}


def parse_identificacao_proposto(text: str) -> Dict[str, Any]:
    block = find_block(r"IDENTIFICAÇÃO DO PROPOSTO:\s*", r"IDENTIFICAÇÃO DO AFASTAMENTO", text) or ""
    if not block:
        return {}

    nome = find_with_stop(r"Nome", block)
    siape = find_with_stop(r"SIAPE", block) or find_one(r"SIAPE:\s*(\d+)", block)
    cpf = find_with_stop(r"CPF", block) or find_one(r"CPF:\s*([0-9\.\-]{11,14}|\d{11})", block)
    cargo = find_with_stop(r"Cargo/Função|Cargo", block) or find_one(r"Cargo[/\s]*Função:\s*(.+)", block)
    telefone = find_with_stop(r"Telefone", block) or find_one(r"Telefone:\s*([\d\(\)\-\s]+)", block)
    email = find_with_stop(r"E[-]?mail|Email", block) or find_one(r"E[-]?mail:\s*([^\s]+@[^\s]+)", block)
    orgao = parse_orgao_exercicio(text)

    return {
        "nome": nome,
        "siape": re.sub(r"\D+", "", siape) if siape else None,
        "cpf": re.sub(r"\D+", "", cpf) if cpf else None,
        "cargo_funcao": cargo,
        "telefone": re.sub(r"\D+", "", telefone) if telefone else None,
        "email": email,
        "orgao": orgao,
    }


def parse_afastamento_trecho(block: str) -> Dict[str, Optional[str]]:
    """Parse a single trecho (ida or retorno) from the afastamento block."""
    origem = (
        find_with_stop(r"Cidade de origem", block)
        or find_one(r"Cidade de origem:\s*(.+)", block, flags=re.IGNORECASE | re.DOTALL)
    )
    destino = (
        find_with_stop(r"Cidade de Destino", block)
        or find_one(r"Cidade de Destino:\s*(.+)", block, flags=re.IGNORECASE | re.DOTALL)
    )

    def _clean(val: Optional[str]) -> str:
        if not val:
            return ""
        # Remove leaked labels from adjacent cells
        val = re.split(r"\s*Data e hora", val, flags=re.IGNORECASE)[0]
        val = re.split(r"\s*RETORNO:\s*", val, flags=re.IGNORECASE)[0]
        val = re.split(r"\s*IDA:\s*", val, flags=re.IGNORECASE)[0]
        val = re.split(r"\s*Cidade de (?:Origem|Destino):", val, flags=re.IGNORECASE)[0]
        return val.strip("|").strip()

    origem = _clean(origem)
    destino = _clean(destino)

    dh = find_one(
        r"Data e hora da Partida:\s*([0-3]\d/[0-1]\d/\d{4}\s+\d{2}:\d{2})",
        block,
        flags=re.IGNORECASE | re.DOTALL,
    ) or find_one(
        r"Data e hora do retorno:\s*([0-3]\d/[0-1]\d/\d{4}\s+\d{2}:\d{2})",
        block,
        flags=re.IGNORECASE | re.DOTALL,
    )
    # Fallback: separate date + time
    if not dh:
        data_val = find_one(
            r"Data e hora (?:da Partida|do retorno):\s*([0-3]\d/[0-1]\d/\d{4})",
            block,
            flags=re.IGNORECASE | re.DOTALL,
        )
        hora_val = find_one(r"(\d{2}:\d{2})", block, flags=re.IGNORECASE)
        if data_val and hora_val:
            dh = f"{data_val} {hora_val}"

    return {
        "origem": origem,
        "destino": destino,
        "data_hora": _parse_br_datetime(dh),
    }


def parse_afastamento(text: str) -> Dict[str, Any]:
    block = find_block(r"IDENTIFICAÇÃO DO AFASTAMENTO:\s*", r"ALTERAÇÕES/\s*CANCELAMENTOS", text) or ""
    if not block:
        block = find_block(r"IDENTIFICAÇÃO DO AFASTAMENTO:\s*", r"DESCRIÇÃO DA VIAGEM", text) or ""
    if not block:
        return {"ida": [], "retorno": []}

    # Split into IDA and RETORNO sub-blocks
    ida_block = find_block(r"IDA:\s*", r"RETORNO:", block) or ""
    ret_block = find_block(r"RETORNO:\s*", r"(?:ALTERAÇÕES|DESCRIÇÃO DA VIAGEM)", block) or ""

    # Fallback: if find_block fails, try manual split
    if not ida_block:
        m = re.search(r"IDA:\s*(.+?)\s*RETORNO:", block, flags=re.IGNORECASE | re.DOTALL)
        ida_block = m.group(1).strip() if m else ""
    if not ret_block:
        m = re.search(
            r"RETORNO:\s*(.+?)(?:\nALTERAÇÕES|\nDESCRIÇÃO DA VIAGEM|$)",
            block,
            flags=re.IGNORECASE | re.DOTALL,
        )
        ret_block = m.group(1).strip() if m else ""

    ida = parse_afastamento_trecho(ida_block)
    ret = parse_afastamento_trecho(ret_block)

    return {
        "ida": [ida] if ida.get("origem") or ida.get("destino") or ida.get("data_hora") else [],
        "retorno": [ret] if ret.get("origem") or ret.get("destino") or ret.get("data_hora") else [],
    }


def parse_atividades(text: str) -> List[Dict[str, str]]:
    block = find_block(r"DESCRIÇÃO DA VIAGEM:\s*", r"JUSTIFICATIVA PARA PRESTAÇÃO DE CONTAS", text) or ""
    if not block:
        return []

    atividades: List[Dict[str, str]] = []
    lines = [ln.strip() for ln in block.splitlines() if ln.strip()]

    for ln in lines:
        # Look for a date (DD/MM/YYYY) anywhere in the line
        m = re.search(r"(\d{2}/\d{2}/\d{4})", ln)
        if not m:
            continue
        data = m.group(1)
        # Split the entire line by | and find which part contains the date
        parts = [p.strip() for p in ln.split("|")]
        # Find the index of the part containing the date
        date_idx = None
        for i, p in enumerate(parts):
            if data in p:
                date_idx = i
                break
        if date_idx is None:
            continue
        # The parts after the date part are: horario, cidade, atividades...
        # But sometimes the date is inside a longer text like "Atividades...: 15/08/2025"
        # Let's normalize: take the part with the date as the data, and subsequent parts as other columns
        after = parts[date_idx + 1:]
        # Clean the data part (remove label text if any)
        data_clean = re.sub(r".*?(\d{2}/\d{2}/\d{4})", r"\1", parts[date_idx])
        if len(after) >= 3:
            atividades.append({
                "data": data_clean,
                "horario": after[0],
                "cidade": after[1],
                "atividades": " | ".join(after[2:]),
            })
        elif len(after) == 2:
            atividades.append({
                "data": data_clean,
                "horario": after[0],
                "cidade": after[1],
                "atividades": "",
            })
        elif len(after) == 1:
            atividades.append({
                "data": data_clean,
                "horario": after[0],
                "cidade": "",
                "atividades": "",
            })
        else:
            atividades.append({
                "data": data_clean,
                "horario": "",
                "cidade": "",
                "atividades": "",
            })

    return atividades


def parse_alteracoes(text: str) -> List[Dict[str, str]]:
    block = find_block(
        r"ALTERAÇÕES/\s*CANCELAMENTOS/\s*NO SHOW\s*",
        r"DESCRIÇÃO DA VIAGEM",
        text,
    ) or ""
    if not block:
        return []

    alteracoes: List[Dict[str, str]] = []
    lines = [ln.strip() for ln in block.splitlines() if ln.strip()]

    # Skip header/description lines
    for ln in lines:
        if re.search(r"alterações realizadas|cancelamento de trechos|não comparecimento", ln, re.IGNORECASE):
            continue
        if "|" in ln:
            parts = [p.strip() for p in ln.split("|")]
            if len(parts) >= 2:
                tipo = parts[0]
                descricao = " | ".join(parts[1:])
                if tipo and descricao:
                    alteracoes.append({"tipo": tipo, "descricao": descricao})
        elif re.match(r"^(Alteração|Cancelamento|No Show|Outro)\s*[-:]\s*(.+)", ln, re.IGNORECASE):
            m = re.match(r"^(Alteração|Cancelamento|No Show|Outro)\s*[-:]\s*(.+)", ln, re.IGNORECASE)
            if m:
                alteracoes.append({"tipo": m.group(1), "descricao": m.group(2)})

    return alteracoes


def parse_justificativa(text: str) -> Optional[str]:
    block = find_block(
        r"JUSTIFICATIVA PARA PRESTAÇÃO DE CONTAS REALIZADA FORA DO PRAZO",
        r"Data:\s*",
        text,
    )
    if block:
        return block.strip()
    return None


def parse_data_relatorio(text: str) -> Optional[str]:
    val = find_one(r"Data:\s*([0-3]\d/[0-1]\d/\d{4})", text, flags=re.IGNORECASE)
    return _parse_br_date(val)


def parse_anexo2_doc_to_json(source: Path | str) -> Dict[str, Any]:
    text = _extract_text(Path(source))
    return {
        "identificacao": parse_identificacao_proposto(text),
        "afastamento": parse_afastamento(text),
        "atividades_tabela": parse_atividades(text),
        "alteracoes": parse_alteracoes(text),
        "justificativa": parse_justificativa(text),
        "data_relatorio": parse_data_relatorio(text),
    }


def build_anexo2_prefill_from_doc(parsed: Dict[str, Any]) -> Dict[str, Any]:
    ident = parsed.get("identificacao") or {}
    afast = parsed.get("afastamento") or {}
    ativs = parsed.get("atividades_tabela") or []
    alts = parsed.get("alteracoes") or []

    prefill = {
        "data_relatorio": parsed.get("data_relatorio"),
        "proposto": {
            "nome": ident.get("nome"),
            "cpf": ident.get("cpf"),
            "siape": ident.get("siape"),
            "cargo_funcao": ident.get("cargo_funcao"),
            "telefone": ident.get("telefone"),
            "email": ident.get("email"),
            "orgao": ident.get("orgao") or {},
        },
        "afastamento": afast,
        "atividades_tabela": ativs,
        "alteracoes_cancelamentos_noshow": alts,
        "atividades_desenvolvidas": None,
        "viagem_realizada": "sim",
    }
    return clean(prefill)


def build_anexo2_warnings(prefill: Dict[str, Any]) -> List[str]:
    warnings: List[str] = []
    prop = prefill.get("proposto") or {}
    afast = prefill.get("afastamento") or {}

    if not prop.get("nome"):
        warnings.append("Nome do proposto não identificado.")
    if not prop.get("cpf"):
        warnings.append("CPF não identificado ou ilegível.")
    if not prop.get("siape"):
        warnings.append("SIAPE não encontrado.")

    orgao = prop.get("orgao") or {}
    if not orgao:
        warnings.append("Órgão de exercício não identificado; selecione manualmente.")
    elif orgao.get("tipo") in ("projetos", "outros") and not orgao.get("detalhe"):
        warnings.append("Detalhe do órgão para Projetos/Outros não foi identificado.")

    ida = afast.get("ida") or []
    ret = afast.get("retorno") or []
    ida_obj = ida[0] if isinstance(ida, list) and ida else {}
    ret_obj = ret[0] if isinstance(ret, list) and ret else {}

    if not ida_obj.get("destino"):
        warnings.append("Trecho de ida incompleto; revise origem/destino.")
    elif not ida_obj.get("origem"):
        warnings.append("Cidade de origem da ida não identificada; revise.")

    if not ret_obj.get("destino"):
        warnings.append("Trecho de retorno incompleto; revise origem/destino.")
    elif not ret_obj.get("origem"):
        warnings.append("Cidade de origem do retorno não identificada; revise.")

    if not ida_obj.get("data_hora") or not ret_obj.get("data_hora"):
        warnings.append("Datas/horários do afastamento não foram lidos; informe manualmente.")

    if not prefill.get("atividades_tabela"):
        warnings.append("Tabela de atividades não foi identificada; preencha manualmente.")

    return warnings


@dataclass
class Anexo2PrefillResult:
    prefill: Dict[str, Any]
    warnings: List[str]


def extract_prefill_for_anexo2(source: Path | str) -> Anexo2PrefillResult:
    parsed = parse_anexo2_doc_to_json(source)
    if not parsed:
        raise ValueError("Não foi possível interpretar o documento.")

    prefill = build_anexo2_prefill_from_doc(parsed)
    warnings = build_anexo2_warnings(prefill)
    return Anexo2PrefillResult(prefill=prefill, warnings=warnings)
