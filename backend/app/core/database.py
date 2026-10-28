import os
from collections.abc import Iterator
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL, Connection, Engine


def get_database_url() -> URL:
    load_dotenv(Path(__file__).resolve().parents[3] / ".env")
    return URL.create(
        "postgresql+psycopg",
        username=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        database=os.environ["POSTGRES_DB"],
    )


@lru_cache
def get_engine() -> Engine:
    return create_engine(get_database_url())


def get_connection() -> Iterator[Connection]:
    """Uma transação por requisição: confirmada ao final, revertida em caso de erro.

    Use sempre por `DbConnection` (app/api/deps.py), que encerra a transação antes
    de a resposta ser enviada.
    """
    with get_engine().begin() as connection:
        yield connection
