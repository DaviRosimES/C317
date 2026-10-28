import os

# Segredo exclusivo dos testes; o valor real vem do .env ou do ambiente.
os.environ.setdefault("AUTH_SECRET_KEY", "segredo-somente-para-testes-nao-usar-em-producao")

from pathlib import Path  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

from app.core.database import get_connection, get_database_url  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.repositories.usuario_repository import UsuarioRepository  # noqa: E402
from scripts.carregar_m6 import aplicar  # noqa: E402
from scripts.m6.contrato import carregar_pacote  # noqa: E402

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


PACOTE_M6 = Path(__file__).resolve().parents[1] / "dados" / "m6"


@pytest.fixture(scope="session")
def pacote():
    """Pacote da G4 (manifesto, catálogos, observações), validado uma vez por sessão."""
    return carregar_pacote(PACOTE_M6)


@pytest.fixture
def m6_vazio(db):
    """Esvazia as tabelas da M6 só dentro da transação do teste, revertida ao final.

    Os testes não dependem de o banco ter ou não recebido a carga real.
    """
    db.execute(text("DELETE FROM observacoes_m6"))
    db.execute(text("DELETE FROM catalogos_m6"))
    db.execute(text("DELETE FROM cargas_m6"))


@pytest.fixture
def psycopg(db, m6_vazio):
    """Conexão psycopg da transação do teste, no formato que o carregador espera."""
    return db.connection.driver_connection


@pytest.fixture
def carregado(db, psycopg, pacote):
    """Carga completa do pacote pelo carregador da G4; tudo entra como rascunho."""
    manifesto, catalogos, observacoes = pacote
    return aplicar(psycopg, "postgresql", manifesto, catalogos, observacoes)
