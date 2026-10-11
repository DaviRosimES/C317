"""Carga reproduzível de demonstração, executada explicitamente pelo desenvolvedor."""

import argparse
import json
from decimal import Decimal
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection

from app.core.database import get_database_url


FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "demonstracao.json"


def load_dataset(filename: Path = FIXTURE) -> dict:
    return json.loads(filename.read_text(encoding="utf-8"), parse_float=Decimal)


def seed_demo(connection: Connection, dataset: dict) -> int:
    with connection.begin_nested():
        return _seed_demo(connection, dataset)


def _seed_demo(connection: Connection, dataset: dict) -> int:
    fonte = dataset["fonte"]
    if not fonte.strip() or "fict" not in fonte.lower():
        raise ValueError("A fonte deve identificar explicitamente os dados fictícios.")
    tipos = {tipo["codigo"]: tipo for tipo in dataset["tipos_indicadores"]}
    codigos_cnae = {setor["codigo_cnae"] for setor in dataset["cnaes"]}
    for registro in dataset["indicadores"]:
        tipo = tipos[registro["tipo"]]
        valor = Decimal(str(registro["valor"]))
        if not valor.is_finite() or valor < 0:
            raise ValueError("Os valores de demonstração devem ser finitos e não negativos.")
        if tipo["unidade"] == "percentual" and valor > 100:
            raise ValueError("Percentuais devem estar entre 0 e 100.")
        if tipo["unidade"] == "quantidade" and valor != valor.to_integral_value():
            raise ValueError("Contagens devem usar números inteiros.")
        cnae = registro.get("codigo_cnae")
        if (tipo["escopo"] == "cnae") != (cnae is not None):
            raise ValueError("O CNAE deve corresponder ao escopo do tipo de indicador.")
        if cnae is not None and cnae not in codigos_cnae:
            raise ValueError("CNAE ausente do catálogo de demonstração.")
        mes = registro.get("mes")
        if mes is not None and not 1 <= mes <= 12:
            raise ValueError("Mês inválido.")
        if registro["status"] not in {"publicado", "rascunho"}:
            raise ValueError("Status inválido na carga de demonstração.")

    for tipo in tipos.values():
        connection.execute(
            text(
                """
                INSERT INTO tipos_indicadores
                    (codigo, nome, descricao, unidade, escopo, fonte_referencia, provisorio)
                VALUES (:codigo, :nome, :descricao, :unidade, :escopo,
                        :fonte_referencia, true)
                ON CONFLICT (codigo) DO NOTHING
                """
            ),
            tipo,
        )
        atual = connection.execute(
            text("SELECT unidade, escopo FROM tipos_indicadores WHERE codigo = :codigo"),
            {"codigo": tipo["codigo"]},
        ).one()
        if (atual.unidade, atual.escopo) != (tipo["unidade"], tipo["escopo"]):
            raise ValueError("Catálogo existente incompatível com a carga de demonstração.")

    setores = {}
    for setor in dataset["cnaes"]:
        connection.execute(
            text(
                """
                INSERT INTO setores (nome, slug, codigo_cnae, fonte_cnae, provisorio)
                VALUES (:nome, :slug, :codigo_cnae, :fonte_cnae, true)
                ON CONFLICT (codigo_cnae) DO NOTHING
                """
            ),
            setor,
        )
        setores[setor["codigo_cnae"]] = connection.execute(
            text("SELECT id FROM setores WHERE codigo_cnae = :codigo"),
            {"codigo": setor["codigo_cnae"]},
        ).scalar_one()

    for rota in dataset["rotas"]:
        connection.execute(
            text(
                """
                INSERT INTO rotas (codigo, nome, descricao)
                VALUES (:codigo, :nome, :descricao)
                ON CONFLICT (codigo) DO NOTHING
                """
            ),
            rota,
        )
    # Nenhum CNAE é associado a uma rota sem uma definição da Prefeitura.
    periodos = {}
    for registro in dataset["indicadores"]:
        chave = (registro["ano"], registro.get("mes"))
        if chave not in periodos:
            conflito = "(ano) WHERE mes IS NULL" if chave[1] is None else "(ano, mes)"
            periodos[chave] = connection.execute(
                text(
                    f"""
                    INSERT INTO periodos (ano, mes) VALUES (:ano, :mes)
                    ON CONFLICT {conflito} DO UPDATE SET ano = EXCLUDED.ano
                    RETURNING id
                    """
                ),
                {"ano": chave[0], "mes": chave[1]},
            ).scalar_one()

        setor_id = setores.get(registro.get("codigo_cnae"))
        alvo = (
            "(tipo, periodo_id) WHERE estabelecimento_id IS NULL AND setor_id IS NULL"
            if setor_id is None
            else "(tipo, periodo_id, setor_id) "
            "WHERE estabelecimento_id IS NULL AND setor_id IS NOT NULL"
        )
        inserido = connection.execute(
            text(
                f"""
                INSERT INTO indicadores
                    (periodo_id, tipo, valor, origem, status, setor_id, demonstracao)
                VALUES (:periodo_id, :tipo, :valor, :origem, :status, :setor_id, true)
                ON CONFLICT {alvo}
                DO UPDATE SET valor = EXCLUDED.valor, status = EXCLUDED.status
                WHERE indicadores.demonstracao AND indicadores.origem = EXCLUDED.origem
                RETURNING id
                """
            ),
            {
                "periodo_id": periodos[chave],
                "tipo": registro["tipo"],
                "valor": Decimal(str(registro["valor"])),
                "origem": fonte,
                "status": registro["status"],
                "setor_id": setor_id,
            },
        ).scalar_one_or_none()
        if inserido is None:
            raise ValueError(
                "Há um lançamento existente fora desta carga no mesmo tipo, período "
                "e CNAE. A transação deve ser revertida; nenhum dado real será substituído."
            )
    return len(dataset["indicadores"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--arquivo", type=Path, default=FIXTURE)
    parser.add_argument(
        "--confirmar-demonstracao",
        action="store_true",
        help="Confirma a inserção explícita de valores fictícios no banco configurado.",
    )
    args = parser.parse_args()
    if not args.confirmar_demonstracao:
        parser.error("Informe --confirmar-demonstracao para executar a carga.")
    engine = create_engine(get_database_url())
    try:
        with engine.begin() as connection:
            quantidade = seed_demo(connection, load_dataset(args.arquivo))
        print(f"Carga concluída: {quantidade} lançamentos fictícios; três CNAEs provisórios.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
