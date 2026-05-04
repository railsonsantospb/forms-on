from __future__ import annotations

import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pdfplumber
from docx import Document


# Known labels that may be broken across lines in PDF extraction
_KNOWN_LABELS = [
    "IDENTIFICAÇÃO",
    "DESCRIÇÃO DO MOTIVO DA VIAGEM",
    "DESTINO (Ida)",
    "DESTINO (Retorno)",
    "DATA/HORA DA MISSÃO",
    "DÉBITO DO RECURSO",
    "Dados Bancários",
    "Nº do Passaporte",
    "Lotação/Órgão",
    "Data/Hora Início",
    "Data/Hora Término",
    "Local de Origem",
    "Local de Destino",
    "Data / Hora",
    "Data/Hora",
]


def _line_looks_like_label_start(line: str) -> bool:
    """Heuristic: does this line look like the beginning of a form label?"""
    stripped = line.strip()
    if not stripped:
        return False
    # Known label words (case-insensitive)
    label_starters = [
        "nome", "cargo", "função", "cpf", "rg", "passaporte", "data", "siape",
        "mãe", "endereço", "telefone", "email", "e-mail", "banco", "agência",
        "conta", "local", "destino", "origem", "dados", "descrição", "débito",
        "missão", "identificação", "lotação", "órgão", "nº",
    ]
    first_word = stripped.split()[0].lower().rstrip(":")
    return first_word in label_starters


def _line_has_value(line: str) -> bool:
    """Check if line already has a value after a colon (e.g. 'RG: 12345')."""
    if ":" not in line:
        return False
    after = line.split(":", 1)[1].strip()
    return bool(after) and not after.endswith(":")


def _merge_label_value_lines(text: str) -> str:
    """If a line ends with ':' and next line is the value, merge them."""
    lines = [ln.strip() for ln in text.splitlines()]
    merged: List[str] = []
    skip = False
    for i, ln in enumerate(lines):
        if skip:
            skip = False
            continue
        if ln.endswith(":") and i + 1 < len(lines):
            nxt = lines[i + 1].strip()
            # next line is likely a value (not another label with colon)
            if nxt and not re.search(r":\s*$", nxt):
                merged.append(f"{ln} {nxt}")
                skip = True
                continue
        merged.append(ln)
    return "\n".join(merged)


def _smart_merge_lines(text: str) -> str:
    """
    Aggressively merge lines that appear to be broken across line breaks
    (common in PDF text extraction from tables).
    Handles:
      - Open parentheses spanning lines: "(foo" + "bar)" → "(foo bar)"
      - Prepositions at line end suggesting a continued label
      - Known label reconstructions
    """
    lines = [ln.strip() for ln in text.splitlines()]
    merged: List[str] = []
    i = 0
    while i < len(lines):
        current = lines[i]
        if not current:
            i += 1
            continue

        # Try to merge with next lines while it makes sense
        while i + 1 < len(lines):
            nxt = lines[i + 1].strip()
            if not nxt:
                break

            # 0. Don't merge if current already has a complete value and next looks like a new label
            if _line_has_value(current) and _line_looks_like_label_start(nxt):
                break

            # 1. Open parenthesis not closed on current line
            if current.count("(") > current.count(")"):
                current = f"{current} {nxt}"
                i += 1
                continue

            # 2. Current line ends with a preposition/article that suggests continuation
            #    e.g. "DESCRIÇÃO DO MOTIVO DA" + "VIAGEM:"
            last_word = current.rstrip(":").rsplit(None, 1)[-1].lower()
            if last_word in {"da", "do", "de", "em", "no", "na", "dos", "das", "a", "o", "e"}:
                # Only merge if next line starts a likely label continuation
                if nxt and (nxt[0].isupper() or nxt[0].isdigit() or nxt.startswith("(") or nxt.startswith("VIAGEM")):
                    current = f"{current} {nxt}"
                    i += 1
                    continue

            # 3. If concatenating current + next forms a known label, merge them
            combined = f"{current} {nxt}"
            for label in _KNOWN_LABELS:
                # Allow flexible matching (case-insensitive, with optional spaces around /)
                label_pattern = re.escape(label).replace(r"\ ", r"\s+").replace(r"/", r"[/\s]*")
                if re.search(label_pattern, combined, re.IGNORECASE):
                    # Check if current alone already contains the full label
                    if not re.search(label_pattern, current, re.IGNORECASE):
                        current = combined
                        i += 1
                        break
            else:
                break

        merged.append(current)
        i += 1

    return "\n".join(merged)


def normalize_text(s: str) -> str:
    """Normalize doc text before applying regexes."""
    s = s.replace("\r", "\n")
    s = _smart_merge_lines(s)
    s = _merge_label_value_lines(s)
    s = _fix_pdf_extraction_artifacts(s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{2,}", "\n", s)
    return s.strip()


def find_one(pattern: str, text: str, flags=re.IGNORECASE) -> Optional[str]:
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else None


# Permite (texto opcional) entre o label e o : — ex: "Nº do Passaporte (Obrigatório...):"
STOP_LABELS_PATTERN = (
    r"(?:Nome completo|Cargo ou Fun[cç][ãa]o que Ocupa|CPF|RG|Nº do Passaporte|Passaporte|"
    r"Data de Nascimento|Siape|Nome da M[ãa]e|Endere[cç]o|Telefone|Email|"
    r"Lotação/Órgão|Lota[cç][ãa]o|Dados Banc[aá]rios|Banc[aá]rios|Banco|Ag[êe]ncia|Conta)"
    r"(?:\s*\([^)]*\))?\s*:"
)


def find_with_stop(label_regex: str, text: str) -> Optional[str]:
    """
    Capture value after label until the next known label (or end).
    Helps when DOCX coloca vários campos na mesma linha.
    """
    pattern = rf"(?:{label_regex})(?:\s*\([^)]*\))?\s*:\s*(.+?)\s*(?={STOP_LABELS_PATTERN}|$)"
    m = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if not m:
        return None
    val = m.group(1).strip()
    # Remove separadores de célula de tabela que podem sobrar
    val = val.strip("|").strip()
    return val


def find_block(start_pat: str, end_pat: str, text: str) -> Optional[str]:
    m = re.search(start_pat + r"(.*?)" + end_pat, text, flags=re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else None


def _is_checked(text: str, label: str) -> bool:
    """Detect if a checkbox is marked (X or ☑) next to a label."""
    # Pattern: (X) Label or (☑) Label or [X] Label
    # label may contain regex escapes like \s+ — if so, use as-is; otherwise escape
    if re.search(r"\\[sbwdSs]|\*|\+|\?|\{", label):
        pattern = rf"\(\s*[xX☑]\s*\)\s*{label}"
    else:
        pattern = rf"\(\s*[xX☑]\s*\)\s*{re.escape(label)}"
    return bool(re.search(pattern, text, flags=re.IGNORECASE))


def parse_tipo_solicitacao(text: str) -> Optional[str]:
    diarias = _is_checked(text, "DIÁRIAS")
    passagens = _is_checked(text, "PASSAGENS")
    if diarias and passagens:
        return "diarias_e_passagens"
    if diarias:
        return "diarias"
    if passagens:
        return "passagens"
    return None


def parse_vinculo(text: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {"tipo_vinculo": None, "vinculo_outro_especificar": None}

    vinculos = [
        ("servidor", r"Servidor\s*\(Servidor\s+da\s+UFPB"),
        ("nao_servidor", r"Não\s+Servidor\s*\(Colaborador"),
        ("sepe", r"SEPE\s*\(Servidor\s+de\s+outra\s+esfera"),
        ("acompanhante_pcd", r"Acompanhante\s+PCD"),
        ("outro", r"Outro\.?\s*Especificar"),
    ]

    for tipo, label_pat in vinculos:
        if _is_checked(text, label_pat):
            result["tipo_vinculo"] = tipo
            break

    if result["tipo_vinculo"] == "outro":
        result["vinculo_outro_especificar"] = find_one(
            r"Outro\.?\s*Especificar:\s*(.+?)(?:\n|$)", text, flags=re.IGNORECASE
        )

    # Auxílio transporte — look in the specific block between labels
    transp_block_match = re.search(
        r"Auxílio Transporte\s*(.+?)\s*Recebe Auxílio Alimentação",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if transp_block_match:
        block = transp_block_match.group(1)
        sim = bool(re.search(r"\(\s*[xX☑]\s*\)\s*SIM", block, re.IGNORECASE))
        nao = bool(re.search(r"\(\s*[xX☑]\s*\)\s*N[ÃA]O", block, re.IGNORECASE))
        val = None
        if sim:
            val_match = re.search(r"VALOR:\s*(\S+)", block, re.IGNORECASE)
            if val_match:
                val = val_match.group(1).strip()
                # Sanity: if value looks like a label, discard
                if val.lower() in ("recebe", "auxílio", "alimentação", "sim", "não"):
                    val = None
        result["auxilio_transporte"] = {"recebe": sim if sim else not nao, "valor": val}
    else:
        # Fallback: search in whole text but scoped
        if "Auxílio Transporte" in text:
            # Find SIM/NAO specifically after Auxílio Transporte and before Alimentação
            scoped = re.search(r"Auxílio Transporte(.+?)Auxílio Alimentação", text, flags=re.IGNORECASE | re.DOTALL)
            scope = scoped.group(1) if scoped else text
            sim = bool(re.search(r"\(\s*[xX☑]\s*\)\s*SIM", scope, re.IGNORECASE))
            nao = bool(re.search(r"\(\s*[xX☑]\s*\)\s*N[ÃA]O", scope, re.IGNORECASE))
            val = None
            if sim:
                val_match = re.search(r"VALOR:\s*(\S+)", scope, re.IGNORECASE)
                if val_match:
                    val = val_match.group(1).strip()
                    if val.lower() in ("recebe", "auxílio", "alimentação", "sim", "não"):
                        val = None
            result["auxilio_transporte"] = {"recebe": sim if sim else not nao, "valor": val}

    # Auxílio alimentação
    alim_block_match = re.search(
        r"Auxílio Alimentação\s*(.+?)\s*(?:Dados Bancários|Nome completo:|$)",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if alim_block_match:
        block = alim_block_match.group(1)
        sim = bool(re.search(r"\(\s*[xX☑]\s*\)\s*SIM", block, re.IGNORECASE))
        nao = bool(re.search(r"\(\s*[xX☑]\s*\)\s*N[ÃA]O", block, re.IGNORECASE))
        val = None
        if sim:
            val_match = re.search(r"VALOR:\s*(\S+)", block, re.IGNORECASE)
            if val_match:
                val = val_match.group(1).strip()
                if val.lower() in ("recebe", "auxílio", "alimentação", "sim", "não"):
                    val = None
        result["auxilio_alimentacao"] = {"recebe": sim if sim else not nao, "valor": val}
    else:
        if "Auxílio Alimentação" in text:
            scoped = re.search(r"Auxílio Alimentação(.+?)Dados Bancários", text, flags=re.IGNORECASE | re.DOTALL)
            scope = scoped.group(1) if scoped else text
            sim = bool(re.search(r"\(\s*[xX☑]\s*\)\s*SIM", scope, re.IGNORECASE))
            nao = bool(re.search(r"\(\s*[xX☑]\s*\)\s*N[ÃA]O", scope, re.IGNORECASE))
            val = None
            if sim:
                val_match = re.search(r"VALOR:\s*(\S+)", scope, re.IGNORECASE)
                if val_match:
                    val = val_match.group(1).strip()
                    if val.lower() in ("recebe", "auxílio", "alimentação", "sim", "não"):
                        val = None
            result["auxilio_alimentacao"] = {"recebe": sim if sim else not nao, "valor": val}

    return result


def parse_transporte(text: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {"meios": [], "distancia_km": None, "termo_veiculo_proprio_ciente": False}

    meios_map = [
        ("veiculo_oficial", r"Veículo\s+Oficial"),
        ("empresa_terrestre", r"Empresa\s+Terrestre"),
        ("empresa_aerea", r"Empresa\s+Aérea"),
        ("veiculo_proprio", r"Veículo\s+Próprio"),
    ]

    block = find_block(r"TRANSPORTE:\s*", r"D[ÉE]BITO DO RECURSO:", text) or ""
    if not block:
        block = text  # fallback

    for meio, label_pat in meios_map:
        if _is_checked(block, label_pat):
            result["meios"].append(meio)

    # distancia_km
    km = find_one(r"dist[âa]ncia\s+percorrida\s*\(em\s*km\)\s*[:\-]?\s*(\d+[\d,.]*)", block, flags=re.IGNORECASE)
    if km:
        result["distancia_km"] = km.replace(",", ".")

    # termo_veiculo_proprio_ciente is not in the printed document; keep False
    return result


def parse_relacao_pertinencia(text: str) -> Optional[str]:
    block = find_block(
        r"RELAÇ[ÃA]O DE PERTIN[ÊE]NCIA.*?finalidades da UFPB\.\s*",
        r"DESTINO\s*\(Ida\)",
        text,
    )
    if block is None:
        m = re.search(
            r"RELAÇ[ÃA]O DE PERTIN[ÊE]NCIA.*?finalidades da UFPB\.\s*(.+?)(?=DESTINO\s*\(Ida\)|$)",
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        block = m.group(1).strip() if m else None
    return block.strip() if block else None


def parse_justificativas(text: str) -> Dict[str, Optional[str]]:
    block = find_block(r"JUSTIFICATIVA:\s*", r"TERMO DE COMPROMISSO", text) or ""
    if not block:
        return {}

    result: Dict[str, Optional[str]] = {}

    # Justificativas are on separate rows but may be merged by _merge_label_value_lines.
    # We split the block by known labels and extract values line-by-line.
    label_patterns = {
        "just_viagem_urgente": r"Viagem\s+urgente(?:\s*\(.*?\))?[:\s]*",
        "just_fds_feriado": r"Final\s+de\s+semana.*?sexta-feira[:\s]*",
        "just_aeroporto": r"Especificação\s+de\s+aeroporto[:\s]*",
        "just_grupo_mais_2": r"Grupo\s+de\s+mais\s+de\s+2\s+pessoas[:\s]*",
        "just_grupo_mais_5": r"Grupo\s+de\s+mais\s+de\s+5\s+pessoas.*?autorizar\)[:\s]*",
        "just_mais_30_diarias": r"Viagem\s+com\s+mais\s+de\s+30\s+diárias.*?autorizar\)[:\s]*",
    }

    # Build a split regex that keeps the labels
    split_re = "(" + "|".join(label_patterns.values()) + ")"
    parts = re.split(split_re, block, flags=re.IGNORECASE)
    # parts = [text_before_first_label, label1, value1, label2, value2, ...]
    current_key = None
    for part in parts:
        if part is None:
            continue
        for key, pat in label_patterns.items():
            if re.match(pat + r"$", part, flags=re.IGNORECASE):
                current_key = key
                break
        else:
            if current_key and part.strip():
                val = part.strip().rstrip(":").strip().lstrip("|").strip()
                # Stop at next known label text inside the value
                for stop_pat in label_patterns.values():
                    if re.search(stop_pat, val, flags=re.IGNORECASE | re.DOTALL):
                        # Truncate at the stop label
                        m_stop = re.search(stop_pat, val, flags=re.IGNORECASE | re.DOTALL)
                        if m_stop:
                            val = val[:m_stop.start()].strip()
                if val:
                    if current_key not in result:
                        result[current_key] = val
                current_key = None

    # Post-process: if Viagem urgente and FDS share a cell, the FDS value may contain both.
    # Try to split the FDS value if it contains multiple lines and urgente is missing.
    fds_val = result.get("just_fds_feriado")
    if fds_val and "just_viagem_urgente" not in result and "\n" in fds_val:
        lines = [l.strip() for l in fds_val.splitlines() if l.strip()]
        if len(lines) >= 2:
            result["just_viagem_urgente"] = lines[0]
            result["just_fds_feriado"] = "\n".join(lines[1:])

    # Clean up leaked sub-label text when no real value was filled
    urgente = result.get("just_viagem_urgente")
    if urgente:
        urgente = re.split(r"\s*\(menos de 20 dias de antecedência\)\s*:?\s*$", urgente, flags=re.IGNORECASE)[0].strip()
        result["just_viagem_urgente"] = urgente or None

    # Remove pipe-only or label-only artifacts
    for key in list(result.keys()):
        val = result.get(key)
        if val and re.fullmatch(r"[|\s]*", val):
            result[key] = None

    return result


def parse_debito_recurso(text: str) -> Optional[str]:
    block = find_block(r"D[ÉE]BITO DO RECURSO:\s*", r"$", text)
    if block is None:
        m = re.search(r"D[ÉE]BITO DO RECURSO:\s*(.+)", text, flags=re.IGNORECASE | re.DOTALL)
        block = m.group(1).strip() if m else ""

    if re.search(r"\(\s*[xX]\s*\)\s*CCHSA\b", block):
        return "CCHSA"
    if re.search(r"\(\s*[xX]\s*\)\s*CAVN\b", block):
        return "CAVN"
    if re.search(r"\(\s*[xX]\s*\)\s*PROJETO\b", block):
        return "PROJETO"

    m_outros = re.search(r"\(\s*[xX]\s*\)\s*Outros:\s*(.+)", block, flags=re.IGNORECASE)
    if m_outros:
        val = m_outros.group(1).strip()
        return f"OUTROS: {val}" if val else "OUTROS"

    m_outros2 = re.search(r"Outros:\s*(.+)", block, flags=re.IGNORECASE)
    if m_outros2 and m_outros2.group(1).strip():
        return f"OUTROS: {m_outros2.group(1).strip()}"
    return None


def parse_destino(text: str, tipo: str) -> Dict[str, Optional[str]]:
    if tipo.lower() == "ida":
        block = find_block(r"DESTINO\s*\(?Ida\)?:\s*", r"DESTINO\s*\(?Retorno\)?:", text)
        if block is None:
            m = re.search(r"DESTINO\s*\(?Ida\)?:\s*(.+)", text, flags=re.IGNORECASE | re.DOTALL)
            block = m.group(1).strip() if m else ""
    else:
        block = find_block(r"DESTINO\s*\(?Retorno\)?:\s*", r"DATA/HORA DA MISS[ÃA]O/COMPROMISSO:", text)
        if block is None:
            m = re.search(r"DESTINO\s*\(?Retorno\)?:\s*(.+)", text, flags=re.IGNORECASE | re.DOTALL)
            block = m.group(1).strip() if m else ""

    # Try "Local de Origem" first, then "Cidade de Origem" (template uses both)
    pattern = (
        r"(?:Local|Cidade)\s+de\s+Origem:\s*(?P<origem>.*?)\s*"
        r"(?=(?:Local|Cidade)\s+de\s+Destino:)"
        r"(?:Local|Cidade)\s+de\s+Destino:\s*(?P<destino>.*?)\s*"
        r"(?=(?:Data\s*/?\s*Hora|Data):)"
        r"(?:Data\s*/?\s*Hora|Data):\s*(?P<datahora>[0-3]\d/[0-1]\d/\d{4})"
    )

    m = re.search(pattern, block, flags=re.IGNORECASE | re.DOTALL)
    if not m:
        origem = (
            find_one(r"Local\s+de\s+Origem:\s*(.+)", block, flags=re.IGNORECASE | re.DOTALL)
            or find_one(r"Cidade\s+de\s+Origem:\s*(.+)", block, flags=re.IGNORECASE | re.DOTALL)
        )
        destino = (
            find_one(r"Local\s+de\s+Destino:\s*(.+)", block, flags=re.IGNORECASE | re.DOTALL)
            or find_one(r"Cidade\s+de\s+Destino:\s*(.+)", block, flags=re.IGNORECASE | re.DOTALL)
            or find_one(r"Destino:\s*(.+)", block, flags=re.IGNORECASE | re.DOTALL)
        )
        # Clean up leaked labels from adjacent cells/lines
        def _clean_destino(val: Optional[str]) -> str:
            if not val:
                return ""
            # Remove everything after Data:, Hora:, or Origem: when it leaks into the value
            val = re.split(r"\s*(?:Data\s*/?\s*Hora|Data|Hora|Origem):\s*", val, flags=re.IGNORECASE)[0]
            return val.strip("|").strip()

        origem = _clean_destino(origem)
        destino = _clean_destino(destino)

        # Fallback: when "Cidade de Origem:" label is missing but city appears before "Cidade de Destino:"
        if not origem or re.fullmatch(r"\d{2}/\d{2}/\d{4}", origem):
            m = re.search(r"Cidade\s+de\s+([A-Za-zÀ-ÿ\s]+?/[A-Z]{2})\s*\|\s*Cidade\s+de\s+Destino:", block, flags=re.IGNORECASE)
            if not m:
                # Even looser: any city/state pattern before Destino
                m = re.search(r"Cidade\s+de\s+([A-Za-zÀ-ÿ\s]+?/[A-Z]{2})\s+(?:Cidade\s+de\s+)?Destino:", block, flags=re.IGNORECASE)
            if m:
                origem = m.group(1).strip()

        dh = find_one(r"(?:Data\s*/?\s*Hora|Data):\s*([0-3]\d/[0-1]\d/\d{4})\s+(\d{2}:\d{2})", block, flags=re.IGNORECASE | re.DOTALL)
        # Also try separate Data + Hora lines
        if not dh:
            data_val = find_one(r"(?:Data\s*/?\s*Hora|Data):\s*([0-3]\d/[0-1]\d/\d{4})", block, flags=re.IGNORECASE | re.DOTALL)
            hora_val = find_one(r"Hora:\s*(\d{2}:\d{2})", block, flags=re.IGNORECASE | re.DOTALL)
            if data_val and hora_val:
                dh = f"{data_val} {hora_val}"
        return {
            "local_origem": origem,
            "local_destino": destino,
            "data_hora": dh,
        }

    # Build datetime from Data + Hora if available
    datahora = m.group("datahora").strip()
    hora_val = find_one(r"Hora:\s*(\d{2}:\d{2})", block, flags=re.IGNORECASE | re.DOTALL)
    if hora_val and not re.search(r"\d{2}:\d{2}$", datahora):
        datahora = f"{datahora} {hora_val}"

    return {
        "local_origem": m.group("origem").strip().strip("|").strip(),
        "local_destino": m.group("destino").strip().strip("|").strip(),
        "data_hora": datahora,
    }


def parse_missao(text: str) -> Dict[str, Optional[str]]:
    block = find_block(r"DATA/HORA DA MISS[ÃA]O(?:/COMPROMISSO)?:\s*", r"D[ÉE]BITO DO RECURSO:", text)
    if block is None:
        m = re.search(r"DATA/HORA DA MISS[ÃA]O(?:/COMPROMISSO)?:\s*(.+)", text, flags=re.IGNORECASE | re.DOTALL)
        block = m.group(1).strip() if m else ""

    inicio = find_one(r"Data/Hora In[ií]cio:\s*([0-3]\d/[0-1]\d/\d{4}\s+\d{2}:\d{2})", block, flags=re.IGNORECASE | re.DOTALL)
    termino = find_one(r"Data/Hora T[eé]rmino:\s*([0-3]\d/[0-1]\d/\d{4}\s+\d{2}:\d{2})", block, flags=re.IGNORECASE | re.DOTALL)

    # PDF extraction may place both dates after Término label (e.g. "Início: | Término: 10/06/2025 08:00 | 12/06/2025 18:00")
    # In that case find_one captures the first date for termino and leaves inicio empty.
    m2 = re.search(
        r"Data/Hora In[ií]cio:\s*\|?\s*Data/Hora T[eé]rmino:\s*([0-3]\d/[0-1]\d/\d{4}\s+\d{2}:\d{2})\s*\|\s*([0-3]\d/[0-1]\d/\d{4}\s+\d{2}:\d{2})",
        block,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if m2:
        inicio = m2.group(1).strip()
        termino = m2.group(2).strip()
    elif not inicio or not termino:
        # Even looser: extract all date-times in the block
        dts = re.findall(r"[0-3]\d/[0-1]\d/\d{4}\s+\d{2}:\d{2}", block)
        if len(dts) >= 2:
            inicio = dts[0]
            termino = dts[1]

    return {"inicio": inicio, "termino": termino}


def parse_identificacao(text: str) -> Dict[str, Any]:
    block = find_block(r"IDENTIFICAÇ[ÃA]O\s*", r"DESCRIÇ[ÃA]O DO MOTIVO DA VIAGEM:", text) or ""

    nome = find_with_stop(r"Nome completo", block)
    cargo = find_with_stop(r"Cargo ou Fun[cç][aã]o que Ocupa", block)

    cpf = find_with_stop(r"CPF", block) or find_one(r"CPF:\s*([0-9\.\-]{11,14}|\d{11})", block)
    rg = find_with_stop(r"RG", block) or find_one(r"RG:\s*([0-9\.\-]+)", block)

    def _find_dob(txt: str) -> Optional[str]:
        """Try multiple patterns to find date of birth."""
        patterns = [
            # Label + value on same line
            r"Data\s+de\s+Nascimento:\s*([0-3]\d/[0-1]\d/\d{4})",
            r"Data\s+Nascimento:\s*([0-3]\d/[0-1]\d/\d{4})",
            r"Nascimento:\s*([0-3]\d/[0-1]\d/\d{4})",
            r"Dt\.?\s*Nasc\.?\s*:\s*([0-3]\d/[0-1]\d/\d{4})",
            r"Dt\.?\s*Nascimento\s*:\s*([0-3]\d/[0-1]\d/\d{4})",
            # Label ends with colon, value on next line
            r"Data\s+de\s+Nascimento:\s*\n\s*([0-3]\d/[0-1]\d/\d{4})",
            r"Data\s+Nascimento:\s*\n\s*([0-3]\d/[0-1]\d/\d{4})",
            r"Nascimento:\s*\n\s*([0-3]\d/[0-1]\d/\d{4})",
            # Value inside parentheses or brackets near label
            r"Data\s+de\s+Nascimento.*?\(?([0-3]\d/[0-1]\d/\d{4})\)?",
            r"Nascimento.*?\(?([0-3]\d/[0-1]\d/\d{4})\)?",
        ]
        for pat in patterns:
            m = re.search(pat, txt, flags=re.IGNORECASE | re.DOTALL)
            if m:
                return m.group(1).strip()
        return None

    nasc = find_with_stop(r"Data de Nascimento", block) or _find_dob(block)
    # Ultimate fallback: any DD/MM/YYYY in the identification block is likely the DOB
    if not nasc:
        dates = re.findall(r"([0-3]\d)[/.-]([0-1]\d)[/.-](\d{4})", block)
        if dates:
            # Pick the earliest date as the most likely birth date
            from datetime import datetime
            parsed_dates = []
            for d in dates:
                try:
                    dt = datetime.strptime(f"{d[0]}/{d[1]}/{d[2]}", "%d/%m/%Y")
                    parsed_dates.append((dt, f"{d[0]}/{d[1]}/{d[2]}"))
                except ValueError:
                    continue
            if parsed_dates:
                parsed_dates.sort(key=lambda x: x[0])
                nasc = parsed_dates[0][1]
    siape = find_with_stop(r"Siape", block) or find_one(r"Siape:\s*(\d+)", block)

    mae = find_with_stop(r"Nome da M[ãa]e", block)
    endereco = find_with_stop(r"Endere[cç]o", block)

    telefone = find_with_stop(r"Telefone", block) or find_one(r"Telefone:\s*([\d\(\)\-\s]+)", block)
    email = find_with_stop(r"Email", block) or find_one(r"Email:\s*([^\s]+@[^\s]+)", block)
    if email:
        # Clean up trailing "Dados Bancários" or just "Bancários"/"Dados" that may leak from next line
        email = re.sub(r"\s*(?:Dados\s+)?Banc[aá]rios:?\s*$", "", email, flags=re.IGNORECASE).strip()
        email = re.sub(r"\s+Dados\s*$", "", email, flags=re.IGNORECASE).strip()

    banco = find_with_stop(r"Banco", block) or find_one(r"Banco:\s*([A-Za-z0-9]+)", block)
    agencia = find_with_stop(r"Ag[êe]ncia", block) or find_one(r"Ag[êe]ncia:\s*([0-9]+)", block)
    conta = find_with_stop(r"Conta", block) or find_one(r"Conta:\s*([0-9]+)", block)
    if conta:
        conta = re.sub(r"\s*(?:Banc[aá]rios:?|Dados\s+Banc[aá]rios:?|\s*DESCRIÇ[ÃA]O\s+DO\s+MOTIVO.*)$", "", conta, flags=re.IGNORECASE).strip()
    passaporte = find_with_stop(r"Nº do Passaporte|Passaporte", block) or find_one(r"Passaporte:\s*(.+)", block)
    lotacao = find_with_stop(r"Lotação/Órgão|Lota[cç][ãa]o", block) or find_one(r"Lota[cç][ãa]o/Órgão:\s*(.+)", block)

    return {
        "nome_completo": nome,
        "cargo_funcao": cargo,
        "cpf": cpf,
        "rg": rg,
        "data_nascimento": nasc,
        "siape": siape,
        "nome_mae": mae,
        "endereco": endereco,
        "telefone": telefone,
        "email": email,
        "passaporte": passaporte,
        "lotacao_orgao": lotacao,
        "dados_bancarios": {"banco": banco, "agencia": agencia, "conta": conta},
    }


def parse_motivo_viagem(text: str) -> Optional[str]:
    block = find_block(r"DESCRIÇ[ÃA]O DO MOTIVO DA VIAGEM:\s*", r"(?:RELAÇ[ÃA]O DE PERTIN[ÊE]NCIA|DESTINO\s*\(Ida\))", text)
    if block is None:
        m = re.search(r"DESCRIÇ[ÃA]O DO MOTIVO DA VIAGEM:\s*(.+?)(?=RELAÇ[ÃA]O DE PERTIN[ÊE]NCIA|DESTINO\s*\(Ida\)|$)", text, flags=re.IGNORECASE | re.DOTALL)
        block = m.group(1).strip() if m else None
    return block.strip() if block else None


def clean(obj: Any) -> Any:
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            v2 = clean(v)
            if v2 in (None, "", {}, []):
                continue
            out[k] = v2
        return out
    if isinstance(obj, list):
        return [clean(v) for v in obj if v not in (None, "")]
    return obj


def _fix_pdf_extraction_artifacts(text: str) -> str:
    """
    Fix known extraction artifacts from PDF table-to-text conversion.
    In generated PDFs, adjacent cells on the same row may get merged
    into a single line by pdfplumber (e.g. Passaporte + Lotação/Órgão).
    """
    # Flexible whitespace helper: use \s+ between words
    # Fix variant 1: Nº do Passaporte (Obrigatório em Lotação/Órgão: X viagens internacionais): Y
    text = re.sub(
        r"Nº\s+do\s+Passaporte\s+\(Obrigatório\s+em\s+Lotação/Órgão:\s*([^\s)]+)\s+viagens\s+internacionais\):\s*([A-Z0-9]+)",
        r"Nº do Passaporte (Obrigatório em viagens internacionais): \2\nLotação/Órgão: \1",
        text,
        flags=re.IGNORECASE,
    )
    # Fix variant 2: value inside parenthetical before label text
    text = re.sub(
        r"Nº\s+do\s+Passaporte\s+\(Obrigatório\s+em\s+([A-Z0-9]+)\s+viagens\s+internacionais\):\s*Lotação/Órgão:\s*\|?\s*([^\s]+)",
        r"Nº do Passaporte (Obrigatório em viagens internacionais): \1\nLotação/Órgão: \2",
        text,
        flags=re.IGNORECASE,
    )
    # Generic variant with possible extra words inside parenthetical
    text = re.sub(
        r"Nº\s+do\s+Passaporte\s+\(Obrigatório\s+em\s+Lotação/Órgão:\s*([^\s)]+)\s+([^)]+)\):\s*([A-Z0-9]+)",
        r"Nº do Passaporte (Obrigatório em \2): \3\nLotação/Órgão: \1",
        text,
        flags=re.IGNORECASE,
    )
    # Variant 4: columns separated by |  e.g. Nº do Passaporte (Obrigatório | Lotação/Órgão: CCHSA em viagens internacionais): XY123456
    text = re.sub(
        r"Nº\s+do\s+Passaporte\s+\(Obrigatório\s*\|\s*Lotação/Órgão:\s*([^\s|]+)\s+em\s+viagens\s+internacionais\):\s*([A-Z0-9]+)",
        r"Nº do Passaporte (Obrigatório em viagens internacionais): \2\nLotação/Órgão: \1",
        text,
        flags=re.IGNORECASE,
    )
    # Fix Data de Nascimento + Siape merged on same line
    text = re.sub(
        r"Data\s+de\s+Nascimento:\s*(\d{2}/\d{2}/\d{4})\s+Siape:\s*(\d+)",
        r"Data de Nascimento: \1\nSiape: \2",
        text,
        flags=re.IGNORECASE,
    )
    return text


def _extract_text_from_pdf(path: Path) -> str:
    try:
        with pdfplumber.open(path) as pdf:
            pages = []
            for page in pdf.pages:
                words = page.extract_words()
                if not words:
                    continue
                # Group words by row (Y position with 3px tolerance)
                rows: Dict[int, List[dict]] = {}
                for w in words:
                    row_key = round(float(w["top"]) / 3)
                    rows.setdefault(row_key, []).append(w)

                lines: List[str] = []
                for row_key in sorted(rows.keys()):
                    row_words = sorted(rows[row_key], key=lambda w: float(w["x0"]))
                    parts: List[str] = []
                    prev_x1 = 0.0
                    for w in row_words:
                        x0 = float(w["x0"])
                        x1 = float(w["x1"])
                        text_word = w["text"]
                        if parts:
                            gap = x0 - prev_x1
                            if gap > 35:  # large gap suggests a new column
                                parts.append("|")
                            elif gap > 1.5:
                                parts.append(" ")
                        parts.append(text_word)
                        prev_x1 = x1
                    line = " ".join(parts)
                    # Clean up spaces around pipes
                    line = re.sub(r" \| ", " | ", line)
                    line = re.sub(r"\|+", "|", line)
                    line = line.strip()
                    if line:
                        lines.append(line)
                pages.append("\n".join(lines))
        text = "\n".join(pages).strip()
        if not text:
            raise ValueError("PDF sem texto. Envie um PDF que não seja imagem/scan.")
        return text
    except Exception as exc:
        raise ValueError("Falha ao ler PDF. Certifique-se de que é um PDF com texto.") from exc


def _convert_to_pdf(path: Path) -> Path:
    tmpdir = Path(tempfile.mkdtemp())
    out_path = tmpdir / f"{path.stem}.pdf"
    # Perfil temporário do LibreOffice em /tmp (container read-only não permite ~/.config)
    user_install = f"file:///tmp/libreoffice_import_{path.stem}"
    cmd = [
        "soffice",
        "-env:UserInstallation=" + user_install,
        "--headless",
        "--nologo",
        "--nolockcheck",
        "--nodefault",
        "--nofirststartwizard",
        "--convert-to", "pdf",
        "--outdir", str(tmpdir),
        str(path),
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
    if result.returncode != 0 or not out_path.exists():
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise ValueError("Falha ao converter arquivo para PDF. Verifique se o DOC/DOCX está legível.")
    return out_path


def _extract_text_from_docx(source: Path) -> str:
    """Extrai texto do DOCX preservando a estrutura das tabelas (linha a linha)."""
    doc = Document(source)
    lines: List[str] = []

    # Iterate over body children in document order (paragraphs + tables interleaved)
    for child in doc.element.body:
        tag = child.tag.split("}")[-1]
        if tag == "p":
            text = child.text.strip() if child.text else ""
            if text:
                lines.append(text)
        elif tag == "tbl":
            # Find the Table object matching this XML element
            table = next((t for t in doc.tables if t._element is child), None)
            if table is None:
                continue
            for row in table.rows:
                # Remove células duplicadas de merged cells e filtra vazias
                unique_cells: List[str] = []
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    if cell_text and (not unique_cells or cell_text != unique_cells[-1]):
                        unique_cells.append(cell_text)
                if unique_cells:
                    lines.append(" | ".join(unique_cells))

    return normalize_text("\n".join(lines))


def _extract_text(source: Path) -> str:
    suffix = source.suffix.lower()
    if suffix == ".pdf":
        return normalize_text(_extract_text_from_pdf(source))
    if suffix in (".docx", ".doc"):
        return _extract_text_from_docx(source)

    raise ValueError("Formato não suportado. Envie PDF, DOC ou DOCX.")


def parse_doc_to_json(source: Path | str) -> Dict[str, Any]:
    text = _extract_text(Path(source))
    vinculo_data = parse_vinculo(text)
    data = {
        "tipo_solicitacao": parse_tipo_solicitacao(text),
        "identificacao": parse_identificacao(text),
        "motivo_viagem": parse_motivo_viagem(text),
        "relacao_pertinencia": parse_relacao_pertinencia(text),
        "destino_ida": parse_destino(text, "Ida"),
        "destino_retorno": parse_destino(text, "Retorno"),
        "missao": parse_missao(text),
        "debito_recurso": parse_debito_recurso(text),
        "transporte": parse_transporte(text),
        "justificativas": parse_justificativas(text),
    }
    # Merge vinculo fields into identificacao
    ident = data.get("identificacao") or {}
    ident["tipo_vinculo"] = vinculo_data.get("tipo_vinculo")
    ident["vinculo_outro_especificar"] = vinculo_data.get("vinculo_outro_especificar")
    ident["auxilio_transporte"] = vinculo_data.get("auxilio_transporte")
    ident["auxilio_alimentacao"] = vinculo_data.get("auxilio_alimentacao")
    data["identificacao"] = ident
    return clean(data)


def _only_digits(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    digits = re.sub(r"\D+", "", value)
    return digits or None


def _parse_br_datetime(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M"):
        try:
            dt = datetime.strptime(value.strip(), fmt)
            return dt.strftime("%Y-%m-%dT%H:%M")
        except ValueError:
            continue
    return None


def _map_orgao(debito: Optional[str]) -> Dict[str, Optional[str]]:
    if not debito:
        return {}
    deb = debito.upper()
    if deb.startswith("CCHSA"):
        return {"tipo": "cchsa"}
    if deb.startswith("CAVN"):
        return {"tipo": "cavn"}
    if deb.startswith("PROJETO"):
        return {"tipo": "projetos"}
    if deb.startswith("OUTROS"):
        detalhe = debito.split(":", 1)[1].strip() if ":" in debito else None
        return {"tipo": "outros", "detalhe": detalhe or None}
    return {}


def build_anexo2_prefill(parsed: Dict[str, Any]) -> Dict[str, Any]:
    ident = parsed.get("identificacao") or {}
    ida = parsed.get("destino_ida") or {}
    ret = parsed.get("destino_retorno") or {}
    missao = parsed.get("missao") or {}

    ida_dt = _parse_br_datetime(ida.get("data_hora")) or _parse_br_datetime(missao.get("inicio"))
    ret_dt = _parse_br_datetime(ret.get("data_hora")) or _parse_br_datetime(missao.get("termino"))

    orgao = _map_orgao(parsed.get("debito_recurso"))
    atividades = parsed.get("motivo_viagem")
    if isinstance(atividades, str):
        atividades = re.sub(r"\s*#+\s*$", "", atividades).strip()

    prefill = {
        "proposto": {
            "nome": ident.get("nome_completo"),
            "cpf": _only_digits(ident.get("cpf")),
            "siape": _only_digits(ident.get("siape")),
            "orgao": orgao,
        },
        "afastamento": {
            "ida": {"origem": ida.get("local_origem"), "destino": ida.get("local_destino"), "data_hora": ida_dt},
            "retorno": {"origem": ret.get("local_origem"), "destino": ret.get("local_destino"), "data_hora": ret_dt},
        },
        "atividades_desenvolvidas": atividades,
        "viagem_realizada": "sim",
    }

    return clean(prefill)


def _build_warnings(prefill: Dict[str, Any]) -> List[str]:
    warnings: List[str] = []
    prop = prefill.get("proposto") or {}
    afast = prefill.get("afastamento") or {}

    if not prop.get("nome"):
        warnings.append("Nome do proposto não identificado no Anexo I.")
    if not prop.get("cpf"):
        warnings.append("CPF não identificado ou ilegível no Anexo I.")
    if not prop.get("siape"):
        warnings.append("SIAPE não encontrado no Anexo I.")
    orgao = prop.get("orgao") or {}
    if not orgao:
        warnings.append("Órgão (débito do recurso) não localizado; selecione manualmente.")
    elif orgao.get("tipo") in ("projetos", "outros") and not orgao.get("detalhe"):
        warnings.append("Detalhe do órgão para Projetos/Outros não foi identificado.")

    ida = afast.get("ida") or {}
    ret = afast.get("retorno") or {}
    if not ida.get("origem") or not ida.get("destino"):
        warnings.append("Trecho de ida incompleto; revise origem/destino.")
    if not ret.get("origem") or not ret.get("destino"):
        warnings.append("Trecho de retorno incompleto; revise origem/destino.")
    if not ida.get("data_hora") or not ret.get("data_hora"):
        warnings.append("Datas/horários não foram lidos; informe manualmente.")

    if not prefill.get("atividades_desenvolvidas"):
        warnings.append("Motivo/atividades não encontrados; escreva o relatório.")

    return warnings


@dataclass
class Anexo1PrefillResult:
    prefill: Dict[str, Any]
    warnings: List[str]


def extract_prefill_from_anexo1(source: Path | str) -> Anexo1PrefillResult:
    parsed = parse_doc_to_json(source)
    if not parsed:
        raise ValueError("Não foi possível interpretar o documento.")

    prefill = build_anexo2_prefill(parsed)
    warnings = _build_warnings(prefill)
    return Anexo1PrefillResult(prefill=prefill, warnings=warnings)


def _parse_br_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        dt = datetime.strptime(value.strip(), "%d/%m/%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def _map_debito_recurso_anexo1(debito: Optional[str]) -> Dict[str, Optional[str]]:
    if not debito:
        return {}
    deb = debito.upper()
    if deb.startswith("CCHSA"):
        return {"tipo": "cchsa"}
    if deb.startswith("CAVN"):
        return {"tipo": "cavn"}
    if deb.startswith("PROJETO"):
        return {"tipo": "projeto"}
    if deb.startswith("OUTROS"):
        detalhe = debito.split(":", 1)[1].strip() if ":" in debito else None
        return {"tipo": "outros", "detalhe": detalhe or None}
    return {}


def build_anexo1_prefill(parsed: Dict[str, Any]) -> Dict[str, Any]:
    ident = parsed.get("identificacao") or {}
    ida = parsed.get("destino_ida") or {}
    ret = parsed.get("destino_retorno") or {}
    missao = parsed.get("missao") or {}
    transp = parsed.get("transporte") or {}
    just = parsed.get("justificativas") or {}

    ida_dt = _parse_br_datetime(ida.get("data_hora")) or _parse_br_datetime(missao.get("inicio"))
    ret_dt = _parse_br_datetime(ret.get("data_hora")) or _parse_br_datetime(missao.get("termino"))
    mi_dt = _parse_br_datetime(missao.get("inicio"))
    mf_dt = _parse_br_datetime(missao.get("termino"))

    # Build transporte object
    transporte = {"meios": transp.get("meios") or [], "termo_veiculo_proprio_ciente": False}
    if transp.get("distancia_km"):
        transporte["distancia_km"] = transp["distancia_km"]

    prefill = {
        "tipo_solicitacao": parsed.get("tipo_solicitacao"),
        "data_solicitacao": None,
        "servidor": {
            "nome_completo": ident.get("nome_completo"),
            "cargo_funcao": ident.get("cargo_funcao"),
            "cpf": _only_digits(ident.get("cpf")),
            "rg": ident.get("rg"),
            "data_nascimento": _parse_br_date(ident.get("data_nascimento")),
            "siape": _only_digits(ident.get("siape")),
            "nome_mae": ident.get("nome_mae"),
            "endereco": ident.get("endereco"),
            "telefone": _only_digits(ident.get("telefone")),
            "email": ident.get("email"),
            "passaporte": ident.get("passaporte"),
            "lotacao_orgao": ident.get("lotacao_orgao"),
            "tipo_vinculo": ident.get("tipo_vinculo"),
            "vinculo_outro_especificar": ident.get("vinculo_outro_especificar"),
            "dados_bancarios": {
                "banco": ident.get("dados_bancarios", {}).get("banco"),
                "agencia": ident.get("dados_bancarios", {}).get("agencia"),
                "conta": ident.get("dados_bancarios", {}).get("conta"),
            },
            "auxilio_transporte": ident.get("auxilio_transporte"),
            "auxilio_alimentacao": ident.get("auxilio_alimentacao"),
        },
        "trechos": {
            "ida": [{"origem": ida.get("local_origem"), "destino": ida.get("local_destino"), "data_hora": ida_dt}],
            "retorno": [{"origem": ret.get("local_origem"), "destino": ret.get("local_destino"), "data_hora": ret_dt}],
        },
        "missao": {"inicio_data_hora": mi_dt, "termino_data_hora": mf_dt},
        "debito_recurso": _map_debito_recurso_anexo1(parsed.get("debito_recurso")),
        "transporte": transporte,
        "motivo_viagem": parsed.get("motivo_viagem"),
        "relacao_pertinencia": parsed.get("relacao_pertinencia"),
        "justificativas": just if just else None,
    }

    return clean(prefill)


def build_anexo1_warnings(prefill: Dict[str, Any], *, skip_trechos: bool = False) -> List[str]:
    warnings: List[str] = []
    servidor = prefill.get("servidor") or {}
    trechos = prefill.get("trechos") or {}
    deb = prefill.get("debito_recurso") or {}

    if not servidor.get("nome_completo"):
        warnings.append("Nome completo não identificado.")
    if not servidor.get("cpf"):
        warnings.append("CPF não identificado ou ilegível.")
    if not servidor.get("siape"):
        warnings.append("SIAPE não identificado.")
    if not servidor.get("data_nascimento"):
        warnings.append("Data de nascimento não encontrada.")

    if not skip_trechos:
        ida_list = trechos.get("ida") or []
        ret_list = trechos.get("retorno") or []
        ida = ida_list[0] if isinstance(ida_list, list) and ida_list else {}
        ret = ret_list[0] if isinstance(ret_list, list) and ret_list else {}

        # Warn if neither origem nor destino is present, or if data_hora is missing
        if not ida.get("destino"):
            warnings.append("Trecho de ida incompleto; revise origem/destino.")
        elif not ida.get("origem"):
            # softer warning: destino was read but origem wasn't
            warnings.append("Cidade de origem da ida não identificada; revise.")

        if not ret.get("destino"):
            warnings.append("Trecho de retorno incompleto; revise origem/destino.")
        elif not ret.get("origem"):
            warnings.append("Cidade de origem do retorno não identificada; revise.")

        if not ida.get("data_hora") or not ret.get("data_hora"):
            warnings.append("Datas/horários não foram lidos; informe manualmente.")

    if not deb.get("tipo"):
        warnings.append("Débito do recurso não identificado; selecione manualmente.")

    if not prefill.get("motivo_viagem"):
        warnings.append("Motivo da viagem não encontrado.")

    return warnings


@dataclass
class Anexo1SelfPrefillResult:
    prefill: Dict[str, Any]
    warnings: List[str]


def extract_prefill_for_anexo1(source: Path | str) -> Anexo1SelfPrefillResult:
    parsed = parse_doc_to_json(source)
    if not parsed:
        raise ValueError("Não foi possível interpretar o documento.")

    prefill = build_anexo1_prefill(parsed)
    warnings = build_anexo1_warnings(prefill, skip_trechos=False)
    return Anexo1SelfPrefillResult(prefill=prefill, warnings=warnings)
