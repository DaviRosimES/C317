"""Carrega os relatórios recebidos do Observatório com acesso conferido (link externo).

Sem --aplicar, só valida o arquivo. Reexecutar não duplica relatórios nem sobrescreve uma
correção feita no banco: um relatório existente com metadados diferentes recusa a carga.
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection

from app.core.database import get_database_url
from scripts.seed_demo import _periodo

ARQUIVO = Path(__file__).resolve().parents[1] / "dados" / "relatorios.json"
TIPOS = {"relatorio_tecnico", "peca_divulgacao"}
CAMPOS = ("titulo", "numero", "tipo", "fonte", "data_publicacao", "ano", "mes")
TEXTOS = ("titulo", "numero", "tipo", "fonte", "data_publicacao", "link_externo", "acesso_conferido_em")


def ler(arquivo: Path = ARQUIVO) -> list[dict]:
    dados = json.loads(arquivo.read_text(encoding="utf-8"))
    relatorios = dados.get("relatorios") if isinstance(dados, dict) else None
    if not isinstance(relatorios, list):
        raise ValueError('O arquivo precisa ter a lista "relatorios".')
    for relatorio in relatorios:
        validar(relatorio)
    links = [relatorio["link_externo"] for relatorio in relatorios]
    if len(set(links)) != len(links):
        raise ValueError("Dois relatórios apontam para o mesmo link.")
    return relatorios


def validar(relatorio: dict) -> None:
    if not isinstance(relatorio, dict):
        raise ValueError("Cada relatório precisa ser um objeto.")
    titulo = relatorio.get("titulo")
    titulo = titulo if isinstance(titulo, str) else ""
    # Tipos conferidos antes das regras, para um JSON malformado ser recusado com mensagem.
    for campo in TEXTOS:
        if not isinstance(relatorio.get(campo), str | None):
            raise ValueError(f"O campo {campo} precisa ser texto ou null: {titulo!r}.")
    for campo in ("ano", "mes"):
        valor = relatorio.get(campo)
        if valor is not None and (isinstance(valor, bool) or not isinstance(valor, int)):
            raise ValueError(f"O campo {campo} precisa ser um número inteiro ou null: {titulo!r}.")
    for campo in ("titulo", "fonte"):
        if not (relatorio.get(campo) or "").strip():
            raise ValueError(f"Relatório sem {campo}: {titulo!r}.")
    if not (relatorio.get("link_externo") or "").startswith("https://"):
        raise ValueError(f"Link externo ausente ou sem https: {titulo!r}.")
    # Só entra o que teve o acesso conferido; o restante fica registrado como pendência.
    if not relatorio.get("acesso_conferido_em"):
        raise ValueError(f"Relatório sem data de acesso conferido: {titulo!r}.")
    date.fromisoformat(relatorio["acesso_conferido_em"])
    if relatorio.get("tipo") is not None and relatorio["tipo"] not in TIPOS:
        raise ValueError(f"Tipo de relatório desconhecido: {relatorio['tipo']!r}.")
    if relatorio.get("numero") is not None and not relatorio["numero"].strip():
        raise ValueError(f"Número vazio: use null quando a fonte não informa ({titulo!r}).")
    if relatorio.get("data_publicacao") is not None:
        date.fromisoformat(relatorio["data_publicacao"])
    ano, mes = relatorio.get("ano"), relatorio.get("mes")
    if ano is not None and not 1900 <= ano <= 2100:
        raise ValueError(f"Ano de referência inválido: {titulo!r}.")
    if mes is not None and (ano is None or not 1 <= mes <= 12):
        raise ValueError(f"Mês de referência inválido ou sem ano: {titulo!r}.")


def carregar(connection: Connection, relatorios: list[dict]) -> dict:
    """Insere os relatórios publicados; os já existentes e iguais são reutilizados."""
    resumo = {"criados": 0, "reutilizados": 0}
    periodos: dict = {}
    with connection.begin_nested():
        for relatorio in relatorios:
            existente = connection.execute(
                text(
                    """
                    SELECT r.titulo, r.numero, r.tipo, r.fonte, r.data_publicacao, p.ano, p.mes,
                           r.status, r.demonstracao
                    FROM relatorios r LEFT JOIN periodos p ON p.id = r.periodo_id
                    WHERE r.link_externo = :link
                    """
                ),
                {"link": relatorio["link_externo"]},
            ).one_or_none()
            esperado = {
                **{campo: relatorio.get(campo) for campo in CAMPOS},
                "data_publicacao": _data(relatorio.get("data_publicacao")),
            }
            if existente is not None:
                atual = {campo: getattr(existente, campo) for campo in CAMPOS}
                if atual != esperado or existente.status != "publicado" or existente.demonstracao:
                    raise ValueError(
                        f"O relatório {relatorio['titulo']!r} já existe com outros metadados ou "
                        "situação. Nada foi alterado; revise a correção existente antes de recarregar."
                    )
                resumo["reutilizados"] += 1
                continue
            ano = relatorio.get("ano")
            connection.execute(
                text(
                    """
                    INSERT INTO relatorios
                        (periodo_id, titulo, numero, tipo, fonte, data_publicacao, link_externo,
                         status, demonstracao)
                    VALUES (:periodo_id, :titulo, :numero, :tipo, :fonte, :data_publicacao, :link,
                            'publicado', false)
                    """
                ),
                {
                    **esperado,
                    "periodo_id": (
                        _periodo(connection, periodos, ano, relatorio.get("mes")) if ano else None
                    ),
                    "link": relatorio["link_externo"],
                },
            )
            resumo["criados"] += 1
    return resumo


def _data(valor: str | None) -> date | None:
    return date.fromisoformat(valor) if valor else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--arquivo", type=Path, default=ARQUIVO)
    parser.add_argument(
        "--aplicar", action="store_true", help="Grava no banco configurado; sem a flag, só valida."
    )
    args = parser.parse_args()
    try:
        relatorios = ler(args.arquivo)
        if not args.aplicar:
            print(f"{len(relatorios)} relatórios válidos; nada foi gravado (use --aplicar).")
            return 0
        engine = create_engine(get_database_url())
        try:
            with engine.begin() as connection:
                resumo = carregar(connection, relatorios)
        finally:
            engine.dispose()
        print(f"Carga concluída: {resumo['criados']} criados, {resumo['reutilizados']} reutilizados.")
        return 0
    except (ValueError, KeyError, OSError) as erro:
        print(f"Carga recusada: {erro}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
