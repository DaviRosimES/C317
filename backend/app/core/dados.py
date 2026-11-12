"""Regras dos Dados do indicador compartilhadas pela carga, pela administração e pela consulta."""

import re
from datetime import date
from decimal import Decimal, InvalidOperation

# Operação e consulta fixas no município (docs/m7/01-estrutura-e-dicionario.md, seção 7).
TERRITORIO_SANTA_RITA = "t_santa_rita_do_sapucai_831ff035c3"

TIPOS_REFERENCIA = ("anual", "mensal", "acumulada", "levantamento", "retrato")
_ORDEM_TIPOS = {tipo: posicao for posicao, tipo in enumerate(TIPOS_REFERENCIA)}
_MESES = (
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
)
_DECIMAL = re.compile(r"^[0-9]+(?:[.,][0-9]+)?$")
_CHAVE = re.compile(
    r"^(?:(anual)-(\d{4})|(mensal)-(\d{4})-(\d{2})|(acumulada|levantamento)-(\d{4})-(\d{4})"
    r"|(retrato)-(\d{4})-(\d{4}-\d{2}-\d{2}))$"
)


def normalizar_valor(texto: str) -> str:
    """Decimal exato como texto de intercâmbio; aceita a vírgula decimal ("44,5" → "44.5").

    Não passa por ponto flutuante e preserva as casas informadas ("1.50" continua "1.50").
    """
    texto = texto.strip() if isinstance(texto, str) else ""
    if not _DECIMAL.match(texto):
        raise ValueError(
            "Informe o valor como número decimal não negativo, sem separador de milhar (ex.: 44,5)."
        )
    texto = texto.replace(",", ".")
    try:
        Decimal(texto)
    except InvalidOperation as erro:  # pragma: no cover - a expressão regular já garante o formato
        raise ValueError("Valor decimal inválido.") from erro
    return texto


def problemas_referencia(referencia: dict) -> list[str]:
    """Referência completa e coerente com o tipo; período desconhecido não é aceito."""
    tipo = referencia.get("tipo")
    if tipo not in TIPOS_REFERENCIA:
        return ["Informe a referência do dado antes de salvar."]
    inicio, fim, mes = referencia.get("ano_inicio"), referencia.get("ano_fim"), referencia.get("mes")
    extracao = referencia.get("data_extracao")
    if not all(isinstance(ano, int) and not isinstance(ano, bool) for ano in (inicio, fim)):
        return ["Informe o ano inicial e o final da referência."]
    problemas = []
    if not (1900 <= inicio <= fim <= 2100):
        problemas.append("O ano inicial precisa estar entre 1900 e 2100 e não pode passar do final.")
    if tipo in ("anual", "mensal", "retrato") and inicio != fim:
        problemas.append(f"A referência {tipo} usa um único ano.")
    if tipo == "mensal":
        if not (isinstance(mes, int) and not isinstance(mes, bool) and 1 <= mes <= 12):
            problemas.append("A referência mensal exige o mês, de 1 a 12.")
    elif mes is not None:
        problemas.append("Mês só é informado na referência mensal.")
    if tipo == "retrato":
        if extracao is None:
            problemas.append("O retrato exige a data de extração.")
    elif extracao is not None:
        problemas.append("Data de extração só é informada no retrato.")
    return problemas


def problemas_compatibilidade(
    *,
    valor: str,
    referencia_tipo: str,
    categoria_classificacao: str | None,
    sem_categoria: bool,
    indicador: dict,
    unidade: dict,
) -> list[str]:
    """Compatibilidade do dado com a definição: referência, categoria e limites da unidade."""
    problemas = []
    if referencia_tipo not in indicador["tipos_referencia_permitidos"]:
        problemas.append(f"O indicador não aceita referência {referencia_tipo}.")
    if sem_categoria:
        if not indicador["aceita_sem_categoria"]:
            problemas.append("O indicador exige uma categoria.")
    elif categoria_classificacao not in indicador["classificacoes_permitidas"]:
        problemas.append("A categoria pertence a uma classificação não aceita pelo indicador.")
    numero = Decimal(valor)
    if unidade["inteira"] and numero != numero.to_integral_value():
        problemas.append(f"A unidade {unidade['nome']} exige valor inteiro.")
    if unidade["maximo"] is not None and numero > Decimal(str(unidade["maximo"])):
        problemas.append(f"O valor passa do máximo da unidade {unidade['nome']} ({unidade['maximo']}).")
    return problemas


# Ano/Período: a referência completa vira uma chave única para o filtro global e a URL.


def chave_periodo(tipo: str, ano_inicio: int, ano_fim: int, mes: int | None, data_extracao: date | None) -> str:
    if tipo == "anual":
        return f"anual-{ano_inicio}"
    if tipo == "mensal":
        return f"mensal-{ano_inicio}-{mes:02d}"
    if tipo == "retrato":
        return f"retrato-{ano_inicio}-{data_extracao.isoformat()}"
    return f"{tipo}-{ano_inicio}-{ano_fim}"


def ler_chave_periodo(chave: str) -> dict:
    """Inverso de `chave_periodo`; ValueError para um texto que não é um período."""
    encontrado = _CHAVE.match(chave or "")
    if not encontrado:
        raise ValueError("Período desconhecido.")
    g = encontrado.groups()
    if g[0]:
        ano = int(g[1])
        return {"tipo": "anual", "ano_inicio": ano, "ano_fim": ano, "mes": None, "data_extracao": None}
    if g[2]:
        ano, mes = int(g[3]), int(g[4])
        if not 1 <= mes <= 12:
            raise ValueError("Período desconhecido.")
        return {"tipo": "mensal", "ano_inicio": ano, "ano_fim": ano, "mes": mes, "data_extracao": None}
    if g[5]:
        inicio, fim = int(g[6]), int(g[7])
        if inicio > fim:
            raise ValueError("Período desconhecido.")
        return {"tipo": g[5], "ano_inicio": inicio, "ano_fim": fim, "mes": None, "data_extracao": None}
    ano = int(g[9])
    try:
        extracao = date.fromisoformat(g[10])
    except ValueError as erro:
        raise ValueError("Período desconhecido.") from erro
    return {"tipo": "retrato", "ano_inicio": ano, "ano_fim": ano, "mes": None, "data_extracao": extracao}


def rotulo_periodo(tipo: str, ano_inicio: int, ano_fim: int, mes: int | None, data_extracao: date | None) -> str:
    """Rótulo de apresentação derivado dos campos estruturados (ex.: "2000–2024 — acumulado")."""
    if tipo == "anual":
        return f"{ano_inicio} — anual"
    if tipo == "mensal":
        return f"{_MESES[mes - 1]} de {ano_inicio} — mensal"
    if tipo == "retrato":
        return f"{ano_inicio} — retrato de {data_extracao.strftime('%d/%m/%Y')}"
    if ano_inicio == ano_fim:
        anos = str(ano_inicio)
    elif tipo == "levantamento" and ano_fim == ano_inicio + 1:
        anos = f"{ano_inicio} e {ano_fim}"
    else:
        anos = f"{ano_inicio}–{ano_fim}"
    return f"{anos} — {'acumulado' if tipo == 'acumulada' else 'levantamento'}"


def ordem_periodo(tipo: str, ano_inicio: int, ano_fim: int, mes: int | None, data_extracao: date | None):
    """Mais recente primeiro; no mesmo fim, períodos mais curtos e tipos na ordem do modelo."""
    return (-ano_fim, -ano_inicio, _ORDEM_TIPOS[tipo], -(mes or 0), -(data_extracao or date.min).toordinal())
