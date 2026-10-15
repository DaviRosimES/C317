from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_preflight_de_origem_permitida():
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_origem_desconhecida_nao_recebe_cabecalho():
    response = client.get("/api/v1/health", headers={"Origin": "http://malicioso.example"})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
