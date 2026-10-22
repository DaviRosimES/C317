"""Transforma a versão recebida do Observatório em um pacote determinístico de carga."""

import argparse
from collections import Counter
from copy import deepcopy
import csv
from decimal import Decimal
from hashlib import sha256
import json
from pathlib import Path
import re
import sys

from scripts.m6.contrato import VERSAO, codigo, decimal_exato, identidade, json_canonico, normalizar, referencia, texto, validar_observacao
from scripts.m6.planilha import Celula, coluna, ler_xlsx, referencias

BACKEND = Path(__file__).resolve().parents[1]
PERFIL = BACKEND / "dados/m6/perfil_origem.json"
ABAS = ("Dados gerais", "Vale da Eletrônica", "Pesquisa e inovação", "Turismo", "Economia criativa", "Eventos")
INPI = "INPI – Anuário Estatístico de Propriedade Industrial (patentes), 2000–2024"
LINK_INPI = "https://www.gov.br/inpi/pt-br/inpi-data/dados-e-series-temporais/tabelas-completas-dos-indicadores-de-pi"
CIDADES = ("Santa Rita do Sapucaí", "Pouso Alegre", "Itajubá", "Lavras", "Poços de Caldas", "Varginha")
PENDENTE = re.compile(r"a confirmar|a preencher|a definir|a validar|a extrair|pendente", re.I)


def ler(celulas: dict, coluna_nome: str, linha: int) -> str:
    return texto(celulas.get(f"{coluna_nome}{linha}", Celula(None)).valor)


def chave_local(aba: str, celula: str) -> str:
    return f"{aba}!{celula}"


def motivo_perfil(perfil: dict, aba: str, linha: int) -> list[str]:
    motivos = []
    for regra in perfil["excluir_intervalos"]:
        if regra["aba"] == aba and regra["inicio"] <= linha <= regra["fim"]:
            motivos.append(regra["motivo"])
    local = chave_local(aba, f"D{linha}")
    if local in perfil["excluir_celulas"]:
        motivos.append(perfil["excluir_celulas"][local])
    return motivos


def obter_territorio(aba: str, linha: int, recorte: str, perfil: dict) -> tuple[str, str]:
    for regra in perfil["territorios_por_intervalo"]:
        if regra["aba"] == aba and regra["inicio"] <= linha <= regra["fim"]:
            return regra["nome"], regra["tipo"]
    for cidade in CIDADES:
        if normalizar(cidade) in normalizar(recorte):
            return cidade, "municipio"
    return "Santa Rita do Sapucaí", "municipio"


def nome_patente(nome: str) -> str | None:
    n = normalizar(nome)
    if "patente" not in n and "utilidade" not in n and "certificado" not in n:
        return None
    ato = "Depósitos" if "deposit" in n else "Concessões" if "concess" in n else None
    especie = "certificados de adição de invenção (CA)" if "certificado" in n else "modelos de utilidade (MU)" if "utilidade" in n else "patentes de invenção (PI)"
    return f"{ato} de {especie}" if ato else None


def classificar_categoria(nome: str, recorte: str, patente: bool) -> tuple[str, str] | None:
    r = normalizar(recorte)
    if patente or r in {"total", "participacao", "somente 2024"} or r.startswith("acumulado"):
        return None
    n = normalizar(nome)
    if n in {"populacao", "sri – populacao", "sri - populacao"} and any(normalizar(c) in r for c in CIDADES):
        return None
    if "por setor" in n:
        return "setor_sebrae", recorte
    if "segmento sebrae" in n:
        return "segmento_sebrae", recorte
    if "por porte" in n:
        return "porte_empresa", recorte
    if nome == "Meios de hospedagem" and r.startswith("por categoria"):
        return "categoria_hospedagem", re.split(r"\s[–-]\s", recorte, maxsplit=1)[-1]
    if "ativos por categoria" in n or "criativos ativos cadastrados" in n:
        return "categoria_cadastro_smcelt", recorte
    if "meses de" in n and "fluxo" in n:
        return "mes_citado_em_questionario", recorte
    return f"recorte_{codigo('i', nome)}", recorte


def registrar(catalogo: dict, prefixo: str, nome: str, **extra) -> str:
    cod = codigo(prefixo, nome)
    catalogo.setdefault(cod, {"codigo": cod, "nome": nome, **extra})
    return cod


def construir_observacao(catalogos: dict, *, aba: str, celula: str, nome: str, recorte: str, valor: str, unidade: str, periodo: str, fonte: str, link: str, territorio: tuple[str, str], observacao: str, formula: str | None, perfil: dict) -> dict:
    patente = unidade == "patentes" and nome_patente(nome) is not None
    nome_canonico = nome_patente(nome) if patente else re.sub(r"^SRI\s*[–-]\s*", "", nome)
    indicador_codigo = registrar(catalogos["indicadores"], "i", nome_canonico)
    inteiras = {"pessoas", "empresas", "empregos", "patentes", "atividades", "empreendimentos", "UHs", "leitos", "respostas", "prestadores", "registros", "projetos", "startups", "eventos", "visitantes", "posição"}
    maximo = 1 if unidade == "índice (0 a 1)" else 100 if unidade.startswith("%") or unidade == "índice (0 a 100)" else 10 if unidade in {"nota", "nota 0–10"} else 5 if unidade == "nota (0 a 5)" else None
    unidade_codigo = registrar(catalogos["unidades"], "u", unidade, inteira=unidade in inteiras, maximo=maximo, casas_exibicao=0 if unidade in inteiras else 2)
    fonte_nome = INPI if patente else fonte
    fonte_codigo = registrar(catalogos["fontes"], "f", fonte_nome, links=[])
    url = LINK_INPI if patente else next(iter(re.findall(r"https?://[^\s)]+", link)), None)
    if url and url not in catalogos["fontes"][fonte_codigo]["links"]:
        catalogos["fontes"][fonte_codigo]["links"].append(url)
    territorio_codigo = registrar(catalogos["territorios"], "t", territorio[0], tipo=territorio[1])
    categoria = classificar_categoria(nome_canonico, recorte, patente)
    categoria_codigo = None
    if categoria:
        categoria_codigo = codigo("c", categoria[0] + ":" + categoria[1])
        catalogos["categorias"].setdefault(categoria_codigo, {"codigo": categoria_codigo, "nome": categoria[1], "classificacao": categoria[0], "codigo_cnae": None})
    tema_codigo = registrar(catalogos["temas"], "tema", "Pesquisa e inovação" if aba == "Patentes por ano" else aba)
    local = chave_local(aba, celula)
    nota = perfil["notas_publicas"].get(local, observacao)
    registro = {
        "indicador_codigo": indicador_codigo,
        "territorio_codigo": territorio_codigo,
        "categoria_codigo": categoria_codigo,
        "unidade_codigo": unidade_codigo,
        "fonte_codigo": fonte_codigo,
        "referencia": referencia(periodo),
        "valor": decimal_exato(valor),
        "qualificador": "maior_que" if "mais de" in normalizar(nome) else "igual",
        "codigo_cnae": None,
        "temas": [tema_codigo],
        "notas": [nota] if nota else [],
        "proveniencias": [{"aba": aba, "celula": celula, "indicador_original": nome, "recorte_original": recorte, "referencia_original": periodo, "valor_xml": valor, "fonte_original": fonte, "link_ou_arquivo_original": link or None, "formula_original": formula}],
    }
    registro["id"] = identidade(registro)
    validar_observacao(registro, catalogos)
    return registro


def preparar(origem: Path, saida: Path, perfil_path: Path = PERFIL) -> dict:
    perfil = json.loads(perfil_path.read_text(encoding="utf-8"))
    digest = sha256(origem.read_bytes()).hexdigest()
    if digest != perfil["origem_sha256"]:
        raise ValueError("A planilha não corresponde à versão revisada. Revisar perfil, estrutura e regras antes de aceitar uma nova origem.")
    abas = ler_xlsx(origem)
    candidatos = {}
    excluidos = {}
    for aba in ABAS:
        celulas = abas[aba]
        linhas = sorted(int(c[1:]) for c in celulas if re.fullmatch(r"B\d+", c) and int(c[1:]) > 1 and celulas[c].valor)
        for linha in linhas:
            local = (aba, f"D{linha}")
            c = celulas.get(local[1], Celula(None))
            registro = {"linha": linha, "celula": c, "nome": ler(celulas, "B", linha), "recorte": ler(celulas, "C", linha), "unidade": ler(celulas, "E", linha), "periodo": ler(celulas, "F", linha), "fonte": ler(celulas, "G", linha), "link": ler(celulas, "H", linha), "observacao": ler(celulas, "K", linha)}
            candidatos[local] = registro
            motivos = motivo_perfil(perfil, aba, linha)
            for campo in ("nome", "recorte", "unidade", "periodo", "fonte"):
                if not registro[campo] or PENDENTE.search(registro[campo]):
                    motivos.append(f"{campo}_ausente_ou_pendente")
            if not c.numerica:
                motivos.append("valor_ausente_ou_nao_numerico")
            try:
                referencia(registro["periodo"])
            except ValueError:
                motivos.append("referencia_nao_confirmada")
            if "rota da inovacao" in normalizar(registro["fonte"]):
                motivos.append("fonte_primaria_a_confirmar_na_origem")
            if re.search(r"confirmar|precisa ser confirmado|alinhar", registro["observacao"], re.I) and chave_local(*local) not in perfil["excecoes_comentarios"]:
                motivos.append("contexto_pendente_na_observacao")
            if motivos:
                excluidos[local] = sorted(set(motivos))
    if len(candidatos) != perfil["linhas_indicadores"]:
        raise ValueError("Número inesperado de linhas: revisar o perfil.")
    # Uma fórmula com cache preenchido não torna seus insumos pendentes publicáveis.
    mudou = True
    while mudou:
        mudou = False
        for local, r in candidatos.items():
            if local in excluidos or not r["celula"].formula:
                continue
            bloqueadas = [chave_local(*p) for p in referencias(r["celula"].formula, local[0]) if p in excluidos]
            if bloqueadas:
                excluidos[local] = ["depende_de_registro_excluido:" + ",".join(sorted(set(bloqueadas)))]
                mudou = True
    for local, r in candidatos.items():
        if local not in excluidos or not r["celula"].formula:
            continue
        bloqueadas = [chave_local(*p) for p in referencias(r["celula"].formula, local[0]) if p in excluidos]
        if bloqueadas:
            motivo = "depende_de_registro_excluido:" + ",".join(sorted(set(bloqueadas)))
            if motivo not in excluidos[local]:
                excluidos[local].append(motivo)

    catalogos = {c: {} for c in ("temas", "indicadores", "categorias", "territorios", "unidades", "fontes")}
    unicas = {}
    por_local = {}
    triagem = []

    def adicionar(r: dict) -> None:
        atual = unicas.get(r["id"])
        if atual is None:
            unicas[r["id"]] = r
            return
        if atual["valor"] != r["valor"] or atual["qualificador"] != r["qualificador"]:
            raise ValueError("Duas linhas da mesma observação divergem; revisar antes da carga.")
        for campo in ("temas", "notas", "proveniencias"):
            for valor in r[campo]:
                if valor not in atual[campo]:
                    atual[campo].append(valor)

    def converter(local: tuple[str, str], visitados: set | None = None) -> dict:
        if local in por_local:
            return deepcopy(por_local[local])
        if local in excluidos:
            raise ValueError("Tentativa de converter registro excluído.")
        visitados = set() if visitados is None else set(visitados)
        if local in visitados:
            raise ValueError("Ciclo de referência na origem.")
        visitados.add(local)
        aba, celula = local
        r = candidatos[local]
        convertido = construir_observacao(catalogos, aba=aba, celula=celula, nome=r["nome"], recorte=r["recorte"], valor=r["celula"].valor, unidade=r["unidade"], periodo=r["periodo"], fonte=r["fonte"], link=r["link"], territorio=obter_territorio(aba, r["linha"], r["recorte"], perfil), observacao=r["observacao"], formula=r["celula"].formula, perfil=perfil)
        formula = r["celula"].formula or ""
        refs = referencias(formula, aba)
        # Uma ligação direta entre abas é outra apresentação da mesma observação.
        alias = perfil.get("mesma_observacao", {}).get(chave_local(*local))
        direto = refs[0] if re.fullmatch(r"(?:'[^']+'!)?\$?[A-Z]+\$?\d+", formula) and len(refs) == 1 and refs[0] in candidatos else None
        if alias or direto:
            destino = tuple(alias.rsplit("!", 1)) if alias else direto
            base = converter(destino, visitados)
            if base["valor"] != convertido["valor"] or base["referencia"] != convertido["referencia"] or base["unidade_codigo"] != convertido["unidade_codigo"]:
                raise ValueError("Ligação direta entre abas com metadados incompatíveis.")
            base["temas"] = sorted(set(base["temas"] + convertido["temas"]))
            base["proveniencias"] += convertido["proveniencias"]
            base["notas"] = list(dict.fromkeys(base["notas"] + convertido["notas"]))
            convertido = base
        por_local[local] = deepcopy(convertido)
        return convertido

    for local, r in candidatos.items():
        motivos = excluidos.get(local, [])
        registro = None if motivos else converter(local)
        if registro:
            adicionar(registro)
        triagem.append({"aba": local[0], "celula": local[1], "indicador": r["nome"], "situacao": "excluido" if motivos else "elegivel", "motivos": " | ".join(motivos), "observacao_id": registro["id"] if registro else ""})

    series = abas["Patentes por ano"]
    conferencias = []
    for linha in range(2, 38):
        fonte = ler(series, "AD", linha)
        if fonte != INPI:
            raise ValueError("Fonte inesperada na série anual de patentes.")
        total = Decimal(0)
        for ano in range(2000, 2025):
            col = coluna(ano - 2000 + 4)
            if ler(series, col, 1) != str(ano):
                raise ValueError("Cabeçalho anual inesperado.")
            celula = f"{col}{linha}"
            valor = series[celula]
            if not valor.numerica:
                raise ValueError("Ano sem valor na série de apoio: revisar antes da carga.")
            total += Decimal(valor.valor)
            registro = construir_observacao(catalogos, aba="Patentes por ano", celula=celula, nome=ler(series, "B", linha), recorte=ler(series, "A", linha), valor=valor.valor, unidade=ler(series, "C", linha), periodo=str(ano), fonte=fonte, link=LINK_INPI, territorio=(ler(series, "A", linha), "municipio"), observacao="Contagem pela cidade do primeiro depositante residente, conforme a série recebida do INPI.", formula=valor.formula, perfil=perfil)
            adicionar(registro)
            triagem.append({"aba": "Patentes por ano", "celula": celula, "indicador": ler(series, "B", linha), "situacao": "elegivel", "motivos": "", "observacao_id": registro["id"]})
        informado = Decimal(ler(series, "AC", linha))
        if total != informado:
            raise ValueError("Soma anual diverge do total informado pelo Observatório.")
        conferencias.append({"linha": linha, "soma_anual": str(total), "total_informado": str(informado), "confere": True})

    for registro in unicas.values():
        registro["temas"].sort()
        registro["proveniencias"].sort(key=lambda p: (p["aba"], p["celula"]))
        validar_observacao(registro, catalogos)
    # Remover catálogos auxiliares criados antes de unificar ligações diretas.
    referencias_catalogos = {"temas": {t for r in unicas.values() for t in r["temas"]}}
    for nome, campo in [("indicadores", "indicador_codigo"), ("territorios", "territorio_codigo"), ("categorias", "categoria_codigo"), ("fontes", "fonte_codigo"), ("unidades", "unidade_codigo")]:
        referencias_catalogos[nome] = {r[campo] for r in unicas.values() if r[campo] is not None}
    catalogos = {nome: {k: v for k, v in sorted(itens.items()) if k in referencias_catalogos[nome]} for nome, itens in catalogos.items()}
    saida.mkdir(parents=True, exist_ok=True)
    if (saida / "perfil_origem.json").resolve() != perfil_path.resolve():
        (saida / "perfil_origem.json").write_bytes(perfil_path.read_bytes())
    (saida / "catalogos.json").write_text(json.dumps(catalogos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (saida / "observacoes.jsonl").write_text("".join(json_canonico(unicas[k]) + "\n" for k in sorted(unicas)), encoding="utf-8")
    with (saida / "triagem.csv").open("w", encoding="utf-8-sig", newline="") as arquivo:
        writer = csv.DictWriter(arquivo, fieldnames=["aba", "celula", "indicador", "situacao", "motivos", "observacao_id"], delimiter=";")
        writer.writeheader()
        writer.writerows(triagem)
    manifesto = {
        "contrato": VERSAO,
        "origem": {"arquivo": origem.name, "sha256": digest},
        "linhas_indicadores": len(candidatos),
        "linhas_indicadores_elegiveis": len(candidatos) - len(excluidos),
        "linhas_indicadores_excluidas": len(excluidos),
        "pontos_series_anuais": 900,
        "observacoes_unicas": len(unicas),
        "repeticoes_unificadas": len(triagem) - len(excluidos) - len(unicas),
        "triagem_por_aba": {aba: dict(Counter(t["situacao"] for t in triagem if t["aba"] == aba)) for aba in (*ABAS, "Patentes por ano")},
        "conferencia_series": conferencias,
        "arquivos_sha256": {nome: sha256((saida / nome).read_bytes()).hexdigest() for nome in ("catalogos.json", "observacoes.jsonl", "triagem.csv", "perfil_origem.json")},
    }
    (saida / "manifesto.json").write_text(json.dumps(manifesto, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifesto


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--origem", required=True, type=Path)
    parser.add_argument("--saida", type=Path, default=BACKEND / "dados/m6")
    args = parser.parse_args()
    try:
        resumo = preparar(args.origem, args.saida)
    except (ValueError, OSError, KeyError) as erro:
        print(f"Preparação recusada: {erro}", file=sys.stderr)
        return 2
    print(json.dumps({k: v for k, v in resumo.items() if k not in {"arquivos_sha256", "conferencia_series"}}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
