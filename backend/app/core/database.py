import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import URL


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
