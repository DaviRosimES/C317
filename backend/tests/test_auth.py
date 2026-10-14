from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.api.deps import AdminUser
from app.core.config import settings
from app.core.database import get_connection, get_database_url
from app.core.security import ALGORITHM, create_access_token, hash_password
from app.main import app
from app.repositories.usuario_repository import UsuarioRepository

SENHA = "senha-de-teste-123"


@pytest.fixture
def db():
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


def usuario(db, email, papel, senha_hash=None):
    return db.execute(
        text(
            """
            INSERT INTO usuarios (nome, email, papel, senha_hash)
            VALUES ('Usuário de teste', :email, :papel, :senha_hash) RETURNING id
            """
        ),
        {"email": email, "papel": papel, "senha_hash": senha_hash},
    ).scalar_one()


def login(client, email, senha):
    return client.post("/api/v1/auth/login", json={"email": email, "senha": senha})


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_senha_armazenada_somente_como_hash(db, admin):
    senha_hash = db.execute(
        text("SELECT senha_hash FROM usuarios WHERE id = :id"), {"id": admin}
    ).scalar_one()
    assert senha_hash.startswith("$argon2")
    assert SENHA not in senha_hash


def test_credenciais_validas_permitem_acesso(client, admin):
    resposta = login(client, "admin.teste@c317.local", SENHA)
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["token_type"] == "bearer"
    assert corpo["expires_in"] == settings.auth_token_expire_minutes * 60

    me = client.get("/api/v1/auth/me", headers=auth(corpo["access_token"]))
    assert me.status_code == 200
    assert me.json() == {
        "id": admin,
        "nome": "Admin de teste",
        "email": "admin.teste@c317.local",
        "papel": "admin",
    }


def test_email_nao_diferencia_maiusculas(client, admin):
    assert login(client, "  Admin.Teste@C317.local ", SENHA).status_code == 200


@pytest.mark.parametrize(
    ("email", "senha"),
    [
        ("admin.teste@c317.local", "senha-errada"),
        ("inexistente@c317.local", SENHA),
    ],
)
def test_credenciais_invalidas_sao_rejeitadas(client, admin, email, senha):
    resposta = login(client, email, senha)
    assert resposta.status_code == 401
    assert resposta.json() == {"detail": "E-mail ou senha inválidos."}
    assert "access_token" not in resposta.text


def test_usuario_sem_senha_definida_nao_autentica(client, db):
    usuario(db, "sem.senha@c317.local", "admin")
    assert login(client, "sem.senha@c317.local", "").status_code == 422
    assert login(client, "sem.senha@c317.local", "qualquer").status_code == 401


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer token-invalido"},
        {"Authorization": "Basic YWRtaW46c2VuaGE="},
    ],
)
def test_me_exige_token_valido(client, db, headers):
    resposta = client.get("/api/v1/auth/me", headers=headers)
    assert resposta.status_code == 401
    assert resposta.headers["WWW-Authenticate"] == "Bearer"


def test_token_expirado_e_rejeitado(client, admin):
    expirado = jwt.encode(
        {"sub": str(admin), "exp": datetime.now(timezone.utc) - timedelta(seconds=1)},
        settings.auth_secret_key,
        algorithm=ALGORITHM,
    )
    assert client.get("/api/v1/auth/me", headers=auth(expirado)).status_code == 401


def test_token_assinado_com_outro_segredo_e_rejeitado(client, admin):
    forjado = jwt.encode(
        {"sub": str(admin), "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        "outro-segredo-qualquer-com-tamanho-suficiente",
        algorithm=ALGORITHM,
    )
    assert client.get("/api/v1/auth/me", headers=auth(forjado)).status_code == 401


def test_token_de_usuario_removido_e_rejeitado(client, db, admin):
    token = create_access_token(admin)
    db.execute(text("DELETE FROM usuarios WHERE id = :id"), {"id": admin})
    assert client.get("/api/v1/auth/me", headers=auth(token)).status_code == 401


@pytest.fixture
def client_protegido(db):
    """Aplicação mínima com uma operação administrativa protegida por require_admin."""
    protegida = FastAPI()
    publicacoes = []

    @protegida.post("/publicar")
    def publicar(admin: AdminUser):
        publicacoes.append(admin.id)
        return {"publicado_por": admin.id}

    protegida.dependency_overrides[get_connection] = lambda: db
    return TestClient(protegida), publicacoes


def test_operacao_administrativa_sem_autenticacao_nao_executa(client_protegido):
    client, publicacoes = client_protegido
    assert client.post("/publicar").status_code == 401
    assert publicacoes == []


def test_operacao_administrativa_exige_papel_admin(client_protegido, db):
    client, publicacoes = client_protegido
    leitor = usuario(db, "leitor@c317.local", "leitor", hash_password(SENHA))
    resposta = client.post("/publicar", headers=auth(create_access_token(leitor)))
    assert resposta.status_code == 403
    assert publicacoes == []


def test_operacao_administrativa_com_admin_executa(client_protegido, admin):
    client, publicacoes = client_protegido
    resposta = client.post("/publicar", headers=auth(create_access_token(admin)))
    assert resposta.status_code == 200
    assert publicacoes == [admin]


def test_consultas_publicas_nao_exigem_autenticacao(client):
    assert client.get("/api/v1/health").status_code == 200
