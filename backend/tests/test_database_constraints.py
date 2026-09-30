import os
from pathlib import Path

import psycopg
import pytest
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


@pytest.fixture
def connection():
    connection = psycopg.connect(
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host="localhost",
        port=int(os.getenv("POSTGRES_PORT", "5432")),
    )
    try:
        yield connection
    finally:
        connection.rollback()
        connection.close()


def test_periodo_rejeita_mes_invalido(connection):
    with pytest.raises(psycopg.errors.CheckViolation):
        connection.execute("INSERT INTO periodos (ano, mes) VALUES (%s, %s)", (2026, 13))


def test_indicador_exige_estabelecimento_existente(connection):
    periodo_id = connection.execute(
        "INSERT INTO periodos (ano, mes) VALUES (%s, %s) RETURNING id",
        (2099, 1),
    ).fetchone()[0]

    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        connection.execute(
            """INSERT INTO indicadores
               (estabelecimento_id, periodo_id, tipo, valor, origem, status)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (-1, periodo_id, "ocupacao", 1, "parceiro", "pendente"),
        )
