"""Contrato de intercâmbio: decimais em texto e referências sem datas presumidas."""

from decimal import Decimal
import csv
from hashlib import sha256
import json
from pathlib import Path
import re
import unicodedata

# Definidas em app.core.contrato_m6, para que a API use exatamente a mesma regra.
from app.core.contrato_m6 import decimal_exato, identidade, json_canonico  # noqa: E402,F401

VERSAO = "c317.m6.v1"
TIPOS_REFERENCIA = {"anual", "mensal", "acumulada", "levantamento", "retrato"}


def texto(valor: str | None) -> str:
    return " ".join((valor or "").split())


def normalizar(valor: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", valor.casefold()) if not unicodedata.combining(c))


def codigo(prefixo: str, nome: str) -> str:
    normal = normalizar(texto(nome))
    slug = re.sub(r"[^a-z0-9]+", "_", normal).strip("_")[:60]
    return f"{prefixo}_{slug}_{sha256(normal.encode()).hexdigest()[:10]}"


def referencia(valor: str) -> dict:
    original = texto(valor)
    if re.fullmatch(r"\d{4}", original):
        return {"tipo": "anual", "ano_inicio": int(original), "ano_fim": int(original), "mes": None}
    m = re.fullmatch(r"(\d{4})[–-](\d{4})", original)
    if m and int(m[1]) <= int(m[2]):
        return {"tipo": "acumulada", "ano_inicio": int(m[1]), "ano_fim": int(m[2]), "mes": None}
    m = re.fullmatch(r"(\d{4}) e (\d{4})", original)
    if m and int(m[1]) <= int(m[2]):
        return {"tipo": "levantamento", "ano_inicio": int(m[1]), "ano_fim": int(m[2]), "mes": None}
    m = re.fullmatch(r"(\d{4}) \(extração (\d{2})/(\d{2})/(\d{4})\)", original)
    if m and m[1] == m[4]:
        from datetime import date
        data = date(int(m[4]), int(m[3]), int(m[2]))
        return {"tipo": "retrato", "ano_inicio": data.year, "ano_fim": data.year, "mes": None, "data_extracao": data.isoformat()}
    meses = {nome: i for i, nome in enumerate(("janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"), 1)}
    m = re.fullmatch(r"([a-z]+) de (\d{4})", normalizar(original))
    if m and m[1] in meses:
        return {"tipo": "mensal", "ano_inicio": int(m[2]), "ano_fim": int(m[2]), "mes": meses[m[1]]}
    raise ValueError(f"Referência não confirmada ou não reconhecida: {original!r}.")


def validar_observacao(registro: dict, catalogos: dict) -> None:
    for campo, tabela in [("indicador_codigo", "indicadores"), ("territorio_codigo", "territorios"), ("unidade_codigo", "unidades"), ("fonte_codigo", "fontes")]:
        if registro.get(campo) not in catalogos[tabela]:
            raise ValueError(f"Referência de catálogo inválida: {campo}.")
    if registro.get("categoria_codigo") is not None and registro["categoria_codigo"] not in catalogos["categorias"]:
        raise ValueError("Categoria desconhecida.")
    if not registro.get("temas") or any(t not in catalogos["temas"] for t in registro["temas"]):
        raise ValueError("Tema ausente ou desconhecido.")
    ref = registro.get("referencia", {})
    if ref.get("tipo") not in TIPOS_REFERENCIA or not 1900 <= ref.get("ano_inicio", 0) <= ref.get("ano_fim", 0) <= 2100:
        raise ValueError("Referência inválida.")
    if ref["tipo"] == "mensal":
        if ref["ano_inicio"] != ref["ano_fim"] or not isinstance(ref.get("mes"), int) or not 1 <= ref["mes"] <= 12:
            raise ValueError("Referência mensal inválida.")
    elif ref.get("mes") is not None:
        raise ValueError("Mês em referência não mensal.")
    if ref["tipo"] in {"anual", "retrato"} and ref["ano_inicio"] != ref["ano_fim"]:
        raise ValueError("Referência pontual com anos diferentes.")
    if ref["tipo"] == "retrato":
        from datetime import date
        data = date.fromisoformat(ref.get("data_extracao", ""))
        if data.year != ref["ano_inicio"]:
            raise ValueError("Data de extração incompatível.")
    if not isinstance(registro.get("valor"), str):
        raise ValueError("O decimal deve ser transmitido como texto.")
    valor = Decimal(decimal_exato(registro["valor"]))
    unidade = catalogos["unidades"][registro["unidade_codigo"]]
    if unidade.get("inteira") and valor != valor.to_integral_value():
        raise ValueError("Contagem fracionária.")
    if unidade.get("maximo") is not None and valor > Decimal(str(unidade["maximo"])):
        raise ValueError("Valor fora da escala da unidade.")
    if registro.get("qualificador") not in {"igual", "maior_que"}:
        raise ValueError("Qualificador desconhecido.")
    if registro.get("id") != identidade(registro):
        raise ValueError("Identidade divergente do conteúdo.")
    if registro.get("codigo_cnae") is not None:
        raise ValueError("A origem desta carga não forneceu códigos CNAE.")
    if not registro.get("proveniencias"):
        raise ValueError("Proveniência ausente.")
    for item in registro["proveniencias"]:
        if not item.get("aba") or not re.fullmatch(r"[A-Z]+\d+", item.get("celula", "")):
            raise ValueError("Localização de origem inválida.")


def carregar_pacote(pasta: Path) -> tuple[dict, dict, list[dict]]:
    manifesto = json.loads((pasta / "manifesto.json").read_text(encoding="utf-8"))
    if manifesto.get("contrato") != VERSAO:
        raise ValueError("Versão do contrato incompatível.")
    nomes = {"catalogos.json", "observacoes.jsonl", "triagem.csv", "perfil_origem.json"}
    if set(manifesto.get("arquivos_sha256", {})) != nomes:
        raise ValueError("Inventário de arquivos incompleto.")
    for nome, esperado in manifesto["arquivos_sha256"].items():
        if sha256((pasta / nome).read_bytes()).hexdigest() != esperado:
            raise ValueError(f"Arquivo alterado após preparação: {nome}.")
    catalogos = json.loads((pasta / "catalogos.json").read_text(encoding="utf-8"))
    perfil = json.loads((pasta / "perfil_origem.json").read_text(encoding="utf-8"))
    if manifesto.get("origem", {}).get("sha256") != perfil.get("origem_sha256"):
        raise ValueError("Hash da origem diferente do perfil revisado.")
    observacoes = [json.loads(linha) for linha in (pasta / "observacoes.jsonl").read_text(encoding="utf-8").splitlines() if linha.strip()]
    ids = set()
    for registro in observacoes:
        validar_observacao(registro, catalogos)
        if registro["id"] in ids:
            raise ValueError("Observação repetida no pacote.")
        ids.add(registro["id"])
    if len(ids) != manifesto.get("observacoes_unicas"):
        raise ValueError("Contagem do manifesto divergente.")
    with (pasta / "triagem.csv").open(encoding="utf-8-sig", newline="") as arquivo:
        triagem = list(csv.DictReader(arquivo, delimiter=";"))
    elegiveis = {}
    excluidas = set()
    for item in triagem:
        local = (item["aba"], item["celula"])
        if local in elegiveis or local in excluidas:
            raise ValueError("Localização duplicada na triagem.")
        if item["situacao"] == "excluido":
            if item["observacao_id"] or not item["motivos"]:
                raise ValueError("Exclusão inconsistente.")
            excluidas.add(local)
        elif item["situacao"] == "elegivel" and item["observacao_id"] in ids and not item["motivos"]:
            elegiveis[local] = item["observacao_id"]
        else:
            raise ValueError("Situação de triagem inválida.")
    encontrados = {}
    for registro in observacoes:
        for item in registro["proveniencias"]:
            local = (item["aba"], item["celula"])
            if elegiveis.get(local) != registro["id"]:
                raise ValueError("Proveniência sem aprovação na triagem ou pertencente a outro registro.")
            if local in encontrados:
                raise ValueError("Proveniência repetida entre observações.")
            encontrados[local] = registro["id"]
            if f'{local[0]}!{local[1]}' in perfil["excluir_celulas"]:
                raise ValueError("Registro bloqueado pelo perfil de origem.")
            for regra in perfil["excluir_intervalos"]:
                if local[0] == regra["aba"] and regra["inicio"] <= int(re.search(r"\d+", local[1])[0]) <= regra["fim"]:
                    raise ValueError("Proveniência em bloco excluído pelo perfil.")
    if encontrados != elegiveis or len(excluidas) != manifesto.get("linhas_indicadores_excluidas"):
        raise ValueError("Triagem e pacote não conferem.")
    total_principais = sum(item["aba"] != "Patentes por ano" for item in triagem)
    if total_principais != manifesto.get("linhas_indicadores") or sum(item["aba"] == "Patentes por ano" for item in triagem) != manifesto.get("pontos_series_anuais"):
        raise ValueError("Cobertura de origem divergente.")
    return manifesto, catalogos, observacoes
