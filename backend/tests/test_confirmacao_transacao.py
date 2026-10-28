"""Regressão da V4: uma resposta de sucesso só sai depois do commit.

Diferente dos demais testes da API, estes não compartilham a conexão da
fixture `db`: cada requisição usa a sua própria transação, como em produção,
e as verificações leem o banco por conexões independentes. Os dados são
confirmados de verdade e removidos ao final.
"""

import json
import threading
import time
import uuid
from contextlib import contextmanager
from decimal import Decimal

import httpx
import pytest
import uvicorn
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text

from app.core.database import get_database_url, get_engine
from app.core.security import create_access_token, hash_password
from app.main import app
from tests.conftest import auth

ANOS = range(2090, 2095)
SEQUENCIAS = 50
# Atraso no commit do servidor: simula um banco mais lento e alarga a janela
# entre a resposta e a confirmação. O cliente nunca espera entre as chamadas.
ATRASO_COMMIT = 0.02


@pytest.fixture(scope="module")
def engine():
    engine = create_engine(get_database_url())
    yield engine
    engine.dispose()


@pytest.fixture
def confirmados(engine):
    """Tipo de indicador e admin confirmados no banco, isolados por um sufixo único."""
    assert not app.dependency_overrides, "estes testes precisam da conexão real da API"
    sufixo = uuid.uuid4().hex[:8]
    tipo = f"teste_v4_{sufixo}"
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO tipos_indicadores (codigo, nome, descricao, unidade, escopo)
                VALUES (:tipo, 'Contagem V4', 'Tipo fictício de teste', 'quantidade', 'municipal')
                """
            ),
            {"tipo": tipo},
        )
        admin = connection.execute(
            text(
                """
                INSERT INTO usuarios (nome, email, papel, senha_hash)
                VALUES ('Admin V4', :email, 'admin', :hash) RETURNING id
                """
            ),
            {"email": f"v4.{sufixo}@c317.local", "hash": hash_password("senha-v4-teste")},
        ).scalar_one()
    try:
        yield {"tipo": tipo, "headers": auth(create_access_token(admin))}
    finally:
        with engine.begin() as connection:
            connection.execute(text("DELETE FROM indicadores WHERE tipo = :tipo"), {"tipo": tipo})
            connection.execute(
                text("DELETE FROM tipos_indicadores WHERE codigo = :tipo"), {"tipo": tipo}
            )
            connection.execute(text("DELETE FROM usuarios WHERE id = :id"), {"id": admin})
            connection.execute(
                text(
                    """
                    DELETE FROM periodos p
                    WHERE p.ano BETWEEN :primeiro AND :ultimo
                      AND NOT EXISTS (SELECT 1 FROM indicadores i WHERE i.periodo_id = p.id)
                      AND NOT EXISTS (SELECT 1 FROM relatorios r WHERE r.periodo_id = p.id)
                    """
                ),
                {"primeiro": ANOS[0], "ultimo": ANOS[-1]},
            )


def lancamento(tipo: str, ano: int, mes: int, valor: int) -> dict:
    return {"tipo": tipo, "valor": str(valor), "ano": ano, "mes": mes, "fonte": "Teste V4"}


def ler(engine, indicador_id: int):
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT status, valor FROM indicadores WHERE id = :id"), {"id": indicador_id}
        ).one_or_none()


class VerificarAoResponder:
    """Middleware ASGI que lê o banco no instante em que o corpo da resposta é enviado."""

    def __init__(self, app, engine):
        self.app = app
        self.engine = engine
        self.leituras = []

    async def __call__(self, scope, receive, send):
        async def enviar(mensagem):
            if mensagem["type"] == "http.response.body" and mensagem.get("body"):
                corpo = json.loads(mensagem["body"])
                if isinstance(corpo, dict) and "id" in corpo:
                    self.leituras.append(ler(self.engine, corpo["id"]))
            await send(mensagem)

        await self.app(scope, receive, enviar)


def test_corpo_da_resposta_so_e_enviado_apos_o_commit(engine, confirmados):
    """Determinístico: antes da correção, o commit acontecia depois deste ponto."""
    verificador = VerificarAoResponder(app, engine)
    client = TestClient(verificador)
    headers = confirmados["headers"]

    criado = client.post(
        "/api/v1/admin/indicadores",
        json=lancamento(confirmados["tipo"], 2090, 1, 10),
        headers=headers,
    )
    assert criado.status_code == 201
    assert verificador.leituras[-1] == ("rascunho", Decimal("10"))

    url = f"/api/v1/admin/indicadores/{criado.json()['id']}"
    assert client.post(f"{url}/publicar", headers=headers).status_code == 200
    assert verificador.leituras[-1] == ("publicado", Decimal("10"))

    assert client.patch(url, json={"valor": "11"}, headers=headers).status_code == 200
    assert verificador.leituras[-1] == ("publicado", Decimal("11"))


@contextmanager
def servidor():
    """Uvicorn real em uma thread: o cliente recebe os bytes assim que são enviados."""
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=0, log_level="warning"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    limite = time.monotonic() + 10
    while not server.started:
        assert thread.is_alive() and time.monotonic() < limite, "o servidor não iniciou"
        time.sleep(0.01)
    porta = server.servers[0].sockets[0].getsockname()[1]
    try:
        # Sem keep-alive: cada requisição abre uma conexão HTTP independente.
        with httpx.Client(
            base_url=f"http://127.0.0.1:{porta}/api/v1",
            limits=httpx.Limits(max_keepalive_connections=0),
        ) as http:
            yield http
    finally:
        server.should_exit = True
        thread.join(timeout=10)


@pytest.fixture
def commit_lento():
    def atrasar(_conexao):
        time.sleep(ATRASO_COMMIT)

    event.listen(get_engine(), "commit", atrasar)
    try:
        yield
    finally:
        event.remove(get_engine(), "commit", atrasar)


def test_sequencias_http_leem_imediatamente_o_que_foi_confirmado(
    engine, confirmados, commit_lento
):
    tipo, headers = confirmados["tipo"], confirmados["headers"]
    esperados = {}

    with servidor() as http:
        for i in range(SEQUENCIAS):
            ano, mes = ANOS[0] + i // 12, i % 12 + 1
            consulta = {"tipo": tipo, "ano": ano, "mes": mes}

            criado = http.post("/admin/indicadores", json=lancamento(tipo, ano, mes, i), headers=headers)
            assert criado.status_code == 201, f"sequência {i}: {criado.text}"
            url = f"/admin/indicadores/{criado.json()['id']}"

            publicado = http.post(f"{url}/publicar", headers=headers)
            assert publicado.status_code == 200, f"sequência {i}: publicar → {publicado.text}"

            publico = http.get("/indicadores", params=consulta).json()
            assert [item["valor"] for item in publico] == [str(i)], f"sequência {i}"

            corrigido = http.patch(url, json={"valor": str(i + 1000)}, headers=headers)
            assert corrigido.status_code == 200, f"sequência {i}: {corrigido.text}"
            publico = http.get("/indicadores", params=consulta).json()
            assert [item["valor"] for item in publico] == [str(i + 1000)], f"sequência {i}"

            esperados[(ano, mes)] = str(i + 1000)

        # Erros continuam revertendo a transação inteira da requisição.
        duplicado = http.post(
            "/admin/indicadores", json=lancamento(tipo, ANOS[0], 1, 1), headers=headers
        )
        assert duplicado.status_code == 409

        ultimo = http.get("/indicadores", params={"tipo": tipo, "ano": ANOS[0], "mes": 2}).json()[0]
        colisao = http.patch(
            f"/admin/indicadores/{ultimo['id']}", json={"valor": "7", "mes": 1}, headers=headers
        )
        assert colisao.status_code == 409
        assert ler(engine, ultimo["id"]) == ("publicado", Decimal(ultimo["valor"]))

        invalido = http.post(
            "/admin/indicadores",
            json={**lancamento(tipo, ANOS[-1], 12, 1), "fonte": " "},
            headers=headers,
        )
        assert invalido.status_code == 422

    # Após reiniciar o servidor, os lançamentos confirmados continuam lá.
    with servidor() as http:
        publicos = http.get("/indicadores", params={"tipo": tipo}).json()
    assert {(item["ano"], item["mes"]): item["valor"] for item in publicos} == esperados
