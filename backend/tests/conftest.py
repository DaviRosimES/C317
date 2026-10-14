import os

# Segredo exclusivo dos testes; o valor real vem do .env ou do ambiente.
os.environ.setdefault("AUTH_SECRET_KEY", "segredo-somente-para-testes-nao-usar-em-producao")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402

from app.core.database import get_connection, get_database_url  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.repositories.usuario_repository import UsuarioRepository  # noqa: E402

SENHA = "senha-de-teste-123"


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def db():
    """Conexão usada também pela API; tudo é revertido ao final do teste."""
    engine = create_engine(get_database_url())
    with engine.connect() as connection:
        transaction = connection.begin()
        app.dependency_overrides[get_connection] = lambda: connection
        try:
            yield connection
        finally:
            app.dependency_overrides.clear()
            transaction.rollback()
    engine.dispose()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin(db):
    return UsuarioRepository(db).salvar_admin(
        "Admin de teste", "admin.teste@c317.local", hash_password(SENHA)
    )


@pytest.fixture
def admin_headers(admin):
    return auth(create_access_token(admin))
