import os

# Segredo exclusivo dos testes; o valor real vem do .env ou do ambiente.
os.environ.setdefault("AUTH_SECRET_KEY", "segredo-somente-para-testes-nao-usar-em-producao")

import json  # noqa: E402
from pathlib import Path  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

from app.core.database import get_connection, get_database_url  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.main import app  # noqa: E402
from app.repositories.usuario_repository import UsuarioRepository  # noqa: E402
from scripts.carregar_m6 import aplicar  # noqa: E402
from scripts.carregar_m7 import aplicar as aplicar_m7, planejar as planejar_m7  # noqa: E402
from scripts.m7.pacote import ler as ler_pacote_m7  # noqa: E402
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


PACOTE_M7 = Path(__file__).resolve().parents[1] / "dados" / "m7"
TABELAS_M7 = (
    "dados_indicadores",
    "indicador_classificacoes",
    "indicador_setores",
    "indicadores_definicoes",
    "categorias",
    "classificacoes",
    "fontes",
    "unidades",
    "setores_observatorio",
)


@pytest.fixture(scope="session")
def catalogos_m7():
    """Catálogo preparado da M7 (contrato c317.m7.g8.v2)."""
    return json.loads((PACOTE_M7 / "catalogos.json").read_text(encoding="utf-8"))


@pytest.fixture
def m7_vazio(db):
    """Esvazia as tabelas de definições e catálogos só dentro da transação do teste."""
    for tabela in TABELAS_M7:
        db.execute(text(f"DELETE FROM {tabela}"))


def inserir_catalogos_m7(db, catalogos: dict) -> None:
    for item in catalogos["setores"].values():
        db.execute(text("INSERT INTO setores_observatorio (codigo, nome) VALUES (:codigo, :nome)"), item)
    for item in catalogos["unidades"].values():
        db.execute(
            text(
                "INSERT INTO unidades (codigo, nome, inteira, maximo, casas_exibicao) "
                "VALUES (:codigo, :nome, :inteira, :maximo, :casas_exibicao)"
            ),
            item,
        )
    for item in catalogos["fontes"].values():
        db.execute(text("INSERT INTO fontes (codigo, nome, links) VALUES (:codigo, :nome, :links)"), item)
    for item in catalogos["classificacoes"].values():
        db.execute(text("INSERT INTO classificacoes (codigo, nome) VALUES (:codigo, :nome)"), item)
    for item in catalogos["categorias"].values():
        db.execute(
            text(
                "INSERT INTO categorias (codigo, nome, classificacao_codigo, codigo_cnae) "
                "VALUES (:codigo, :nome, :classificacao, :codigo_cnae)"
            ),
            item,
        )
    for item in catalogos["indicadores"].values():
        db.execute(
            text(
                """
                INSERT INTO indicadores_definicoes
                    (codigo, nome, definicao, unidade_codigo, tipos_referencia_permitidos,
                     aceita_sem_categoria, nota_metodologica)
                VALUES (:codigo, :nome, :definicao, :unidade_codigo, :tipos_referencia_permitidos,
                        :aceita_sem_categoria, :nota_metodologica)
                """
            ),
            item,
        )
        for setor in item["setores"]:
            db.execute(
                text("INSERT INTO indicador_setores VALUES (:indicador, :setor)"),
                {"indicador": item["codigo"], "setor": setor},
            )
        for classificacao in item["classificacoes_permitidas"]:
            db.execute(
                text("INSERT INTO indicador_classificacoes VALUES (:indicador, :classificacao)"),
                {"indicador": item["codigo"], "classificacao": classificacao},
            )


@pytest.fixture
def definicoes_m7(db, m7_vazio, catalogos_m7):
    """As 61 definições e os catálogos do pacote, inseridos na transação do teste."""
    inserir_catalogos_m7(db, catalogos_m7)
    return catalogos_m7


@pytest.fixture(scope="session")
def pacote_m7():
    """Pacote c317.m7.g8.v2 validado uma vez por sessão (hashes, contagens e vínculos)."""
    return ler_pacote_m7(PACOTE_M7)


@pytest.fixture
def dados_m7(db, definicoes_m7, m6_vazio, pacote_m7):
    """Carga da M7 sobre definições já existentes e M6 vazia: 303 dados novos em rascunho."""
    return aplicar_m7(db, planejar_m7(db, pacote_m7))


@pytest.fixture
def publicados_m7(db, dados_m7):
    """Simulação do pacote com todos os dados publicados (a publicação real é da administração)."""
    db.execute(text("UPDATE dados_indicadores SET status = 'publicado'"))
    return dados_m7
