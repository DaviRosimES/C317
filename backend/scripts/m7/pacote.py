"""Leitura e validação offline do pacote `c317.m7.g8.v2` (backend/dados/m7).

Confere versão, hashes do manifesto, contagens, vínculos de catálogo, unidades, referências,
decimais e identidade. Não acessa o banco.
"""

import csv
import json
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path

from app.core.dados import (
    TERRITORIO_SANTA_RITA,
    normalizar_valor,
    problemas_compatibilidade,
    problemas_referencia,
)

CONTRATO = "c317.m7.g8.v2"
PASTA = Path(__file__).resolve().parents[2] / "dados" / "m7"
CATALOGOS = ("setores", "unidades", "fontes", "classificacoes", "categorias", "territorios", "indicadores")
CAMPOS_DADO = {
    "id", "indicador_codigo", "territorio_codigo", "categoria_codigo", "referencia", "valor",
    "qualificador", "fonte_codigo", "notas", "origens", "demonstracao",
}
# Contagens do manifesto conferidas contra os arquivos.
CONTAGENS = {
    "indicadores_destino": lambda p: len(p.catalogos["indicadores"]),
    "dados_destino": lambda p: len(p.dados),
    "associacoes_indicador_setor": lambda p: len(p.associacoes),
    "setores_destino": lambda p: len(p.catalogos["setores"]),
    "classificacoes_destino": lambda p: len(p.catalogos["classificacoes"]),
    "categorias_destino": lambda p: len(p.catalogos["categorias"]),
    "dados_retirados_por_abrangencia": lambda p: len(p.retirados),
    "exclusoes_origem_preservadas": lambda p: p.exclusoes,
}


class PacoteInvalido(ValueError):
    def __init__(self, problemas: list[str]):
        self.problemas = problemas
        resumo = "; ".join(problemas[:10])
        extra = f" (e mais {len(problemas) - 10})" if len(problemas) > 10 else ""
        super().__init__(f"Pacote inválido: {resumo}{extra}.")


@dataclass
class Pacote:
    manifesto: dict
    catalogos: dict
    dados: list[dict]
    associacoes: list[tuple[str, str]]
    mapeamento: dict[str, str]  # id do dado M7 -> id de origem na M6
    retirados: list[str]
    legado_demonstracao: list[str]
    exclusoes: int
    hash: str


def _csv(caminho: Path) -> list[dict]:
    with caminho.open(encoding="utf-8-sig", newline="") as arquivo:
        return list(csv.DictReader(arquivo, delimiter=";"))


def ler(pasta: Path = PASTA) -> Pacote:
    manifesto = json.loads((pasta / "manifesto.json").read_text(encoding="utf-8"))
    if manifesto.get("contrato") != CONTRATO:
        raise PacoteInvalido([f"contrato {manifesto.get('contrato')!r} não é {CONTRATO}"])
    problemas = []
    for nome, esperado in sorted(manifesto.get("arquivos_sha256", {}).items()):
        caminho = pasta / nome
        if not caminho.is_file():
            problemas.append(f"arquivo ausente: {nome}")
        elif sha256(caminho.read_bytes()).hexdigest() != esperado:
            problemas.append(f"hash divergente: {nome}")
    if problemas:
        raise PacoteInvalido(problemas)

    catalogos = json.loads((pasta / "catalogos.json").read_text(encoding="utf-8"))
    dados = [
        json.loads(linha)
        for linha in (pasta / "dados_indicadores.jsonl").read_text(encoding="utf-8").splitlines()
        if linha.strip()
    ]
    pacote = Pacote(
        manifesto=manifesto,
        catalogos=catalogos,
        dados=dados,
        associacoes=[
            (linha["indicador_codigo"], linha["setor_codigo"])
            for linha in _csv(pasta / "setores_indicadores.csv")
        ],
        mapeamento={
            linha["id_destino_m7"]: linha["id_origem_m6"] for linha in _csv(pasta / "mapeamento_m6_m7.csv")
        },
        retirados=[linha["id_origem_m6"] for linha in _csv(pasta / "retirados_por_abrangencia.csv")],
        legado_demonstracao=[linha["codigo_legado"] for linha in _csv(pasta / "legado_demonstracao.csv")],
        exclusoes=len(_csv(pasta / "exclusoes.csv")),
        hash=sha256(
            "".join(f"{nome}:{valor}" for nome, valor in sorted(manifesto["arquivos_sha256"].items())).encode()
        ).hexdigest(),
    )
    problemas = validar(pacote)
    if problemas:
        raise PacoteInvalido(problemas)
    return pacote


def validar(p: Pacote) -> list[str]:
    problemas = []
    c = p.catalogos
    for nome in CATALOGOS:
        if not isinstance(c.get(nome), dict):
            return [f"catálogo ausente: {nome}"]
        for codigo, item in c[nome].items():
            if item.get("codigo") != codigo or not str(item.get("nome", "")).strip():
                problemas.append(f"{nome}/{codigo}: código ou nome inválido")
    for campo, contar in CONTAGENS.items():
        if campo in p.manifesto and contar(p) != p.manifesto[campo]:
            problemas.append(f"{campo}: manifesto {p.manifesto[campo]}, arquivos {contar(p)}")

    for codigo, categoria in c["categorias"].items():
        if categoria.get("classificacao") not in c["classificacoes"]:
            problemas.append(f"categoria {codigo}: classificação desconhecida")
    for codigo, indicador in c["indicadores"].items():
        if indicador.get("unidade_codigo") not in c["unidades"]:
            problemas.append(f"indicador {codigo}: unidade desconhecida")
        if not indicador.get("setores") or not set(indicador["setores"]) <= set(c["setores"]):
            problemas.append(f"indicador {codigo}: setores ausentes ou desconhecidos")
        if not set(indicador.get("classificacoes_permitidas", [])) <= set(c["classificacoes"]):
            problemas.append(f"indicador {codigo}: classificação desconhecida")
        if not indicador.get("aceita_sem_categoria") and not indicador.get("classificacoes_permitidas"):
            problemas.append(f"indicador {codigo}: exige categoria sem aceitar classificação")
    esperado = {(i, s) for i, ind in c["indicadores"].items() for s in ind.get("setores", [])}
    if set(p.associacoes) != esperado or len(p.associacoes) != len(esperado):
        problemas.append("setores_indicadores.csv diverge dos setores das definições")

    ids, identidades = set(), {}
    for dado in p.dados:
        problemas += [f"dado {dado.get('id')}: {msg}" for msg in _problemas_dado(dado, c)]
        if dado.get("id") in ids:
            problemas.append(f"dado {dado['id']}: id repetido")
        ids.add(dado.get("id"))
        identidade = identidade_do_pacote(dado)
        if identidade in identidades:
            problemas.append(f"dado {dado['id']}: mesma identidade de {identidades[identidade]}")
        identidades[identidade] = dado.get("id")
    if set(p.mapeamento) != ids:
        problemas.append("mapeamento_m6_m7.csv não cobre exatamente os dados do pacote")
    if ids & set(p.retirados):
        problemas.append("há dados retirados por abrangência dentro da carga")
    return problemas


def _problemas_dado(dado: dict, c: dict) -> list[str]:
    if set(dado) != CAMPOS_DADO:
        return [f"campos {sorted(set(dado) ^ CAMPOS_DADO)} fora do contrato"]
    if not isinstance(dado["id"], str) or len(dado["id"]) != 64 or not all(
        ch in "0123456789abcdef" for ch in dado["id"]
    ):
        return ["id fora do formato"]
    indicador = c["indicadores"].get(dado["indicador_codigo"])
    if indicador is None:
        return ["indicador desconhecido"]
    if dado["territorio_codigo"] != TERRITORIO_SANTA_RITA:
        return ["território fora de Santa Rita do Sapucaí"]
    if dado["fonte_codigo"] not in c["fontes"]:
        return ["fonte desconhecida"]
    categoria = None
    if dado["categoria_codigo"] is not None:
        categoria = c["categorias"].get(dado["categoria_codigo"])
        if categoria is None:
            return ["categoria desconhecida"]
    if dado["qualificador"] not in ("igual", "maior_que"):
        return ["qualificador inválido"]
    if not isinstance(dado["notas"], list) or not all(isinstance(n, str) for n in dado["notas"]):
        return ["notas precisam ser uma lista de textos"]
    if not isinstance(dado["origens"], list) or dado["demonstracao"] is not False:
        return ["origens inválidas ou dado marcado como demonstração"]
    referencia = dado["referencia"]
    if not isinstance(referencia, dict) or (problemas := problemas_referencia(referencia)):
        return problemas or ["referência inválida"]
    if not isinstance(dado["valor"], str):
        return ["valor precisa ser texto decimal"]
    try:
        valor = normalizar_valor(dado["valor"])
    except ValueError as erro:
        return [str(erro)]
    if valor != dado["valor"]:
        return ["valor fora do formato de intercâmbio"]
    return problemas_compatibilidade(
        valor=valor,
        referencia_tipo=referencia["tipo"],
        categoria_classificacao=categoria["classificacao"] if categoria else None,
        sem_categoria=categoria is None,
        indicador=indicador,
        unidade=c["unidades"][indicador["unidade_codigo"]],
    )


def identidade_do_pacote(dado: dict) -> tuple:
    r = dado.get("referencia") or {}
    return (
        dado.get("indicador_codigo"), dado.get("territorio_codigo"), dado.get("categoria_codigo"),
        dado.get("fonte_codigo"), r.get("tipo"), r.get("ano_inicio"), r.get("ano_fim"), r.get("mes"),
        r.get("data_extracao"),
    )
