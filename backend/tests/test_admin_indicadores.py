from decimal import Decimal

import pytest
from sqlalchemy import text

from app.core.security import create_access_token, hash_password
from tests.conftest import auth

URL = "/api/v1/admin/indicadores"
CNAE = "9999-9/01"


@pytest.fixture
def catalogo(db):
    """Catálogo fictício e isolado: não depende da carga de demonstração."""
    for codigo, unidade, escopo in [
        ("teste_contagem", "quantidade", "municipal"),
        ("teste_percentual", "percentual", "municipal"),
        ("teste_por_cnae", "quantidade", "cnae"),
    ]:
        db.execute(
            text(
                """
                INSERT INTO tipos_indicadores (codigo, nome, descricao, unidade, escopo)
                VALUES (:codigo, :codigo, 'Tipo fictício de teste', :unidade, :escopo)
                """
            ),
            {"codigo": codigo, "unidade": unidade, "escopo": escopo},
        )
    db.execute(
        text(
            """
            INSERT INTO setores (nome, slug, codigo_cnae)
            VALUES ('CNAE fictício de teste', 'teste-cnae', :codigo)
            """
        ),
        {"codigo": CNAE},
    )


def lancamento(**campos):
    return {
        "tipo": "teste_contagem",
        "valor": "10",
        "ano": 2080,
        "mes": 1,
        "fonte": "Dados fictícios de teste",
        **campos,
    }


@pytest.fixture
def criar(client, admin_headers, catalogo):
    def _criar(**campos):
        return client.post(URL, json=lancamento(**campos), headers=admin_headers)

    return _criar


def total_indicadores(db):
    return db.execute(text("SELECT count(*) FROM indicadores")).scalar_one()


def test_lancamento_e_persistido_como_rascunho(db, criar, admin):
    resposta = criar(valor="1200", fonte="  Base municipal de empregos  ")
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["status"] == "rascunho"
    assert corpo["valor"] == "1200"
    assert corpo["fonte"] == "Base municipal de empregos"
    assert corpo["unidade"] == "quantidade"
    assert corpo["codigo_cnae"] is None
    assert corpo["validado_por"] is None

    salvo = db.execute(
        text(
            """
            SELECT i.valor, i.origem, i.status, i.setor_id, i.estabelecimento_id, p.ano, p.mes
            FROM indicadores i JOIN periodos p ON p.id = i.periodo_id WHERE i.id = :id
            """
        ),
        {"id": corpo["id"]},
    ).one()
    assert salvo == (Decimal("1200"), "Base municipal de empregos", "rascunho", None, None, 2080, 1)


def test_lancamento_por_cnae(criar):
    resposta = criar(tipo="teste_por_cnae", codigo_cnae=CNAE)
    assert resposta.status_code == 201
    assert resposta.json()["codigo_cnae"] == CNAE


def test_periodo_anual_reutiliza_o_mesmo_registro(db, criar):
    primeiro = criar(mes=None)
    segundo = criar(tipo="teste_percentual", valor="50", mes=None)
    assert primeiro.status_code == segundo.status_code == 201
    assert primeiro.json()["mes"] is None
    periodos = db.execute(
        text("SELECT count(*) FROM periodos WHERE ano = 2080 AND mes IS NULL")
    ).scalar_one()
    assert periodos == 1


@pytest.mark.parametrize("fonte", [None, "", "   "])
def test_registro_sem_fonte_e_rejeitado(db, client, admin_headers, catalogo, fonte):
    corpo = lancamento()
    if fonte is None:
        del corpo["fonte"]
    else:
        corpo["fonte"] = fonte
    antes = total_indicadores(db)
    assert client.post(URL, json=corpo, headers=admin_headers).status_code == 422
    assert total_indicadores(db) == antes


@pytest.mark.parametrize("valor", ["100.01", "-0.5", "150"])
def test_percentual_fora_do_intervalo_e_rejeitado(criar, valor):
    resposta = criar(tipo="teste_percentual", valor=valor)
    assert resposta.status_code == 422
    assert resposta.json() == {"detail": "Percentuais devem estar entre 0 e 100."}


@pytest.mark.parametrize("valor", ["0", "100", "68.25"])
def test_percentual_dentro_do_intervalo_e_aceito(criar, valor):
    resposta = criar(tipo="teste_percentual", valor=valor)
    assert resposta.status_code == 201
    assert Decimal(resposta.json()["valor"]) == Decimal(valor)


@pytest.mark.parametrize("valor", ["10.5", "-1"])
def test_quantidade_exige_inteiro_nao_negativo(criar, valor):
    assert criar(valor=valor).status_code == 422


def test_quantidade_inteira_com_decimais_zerados_e_normalizada(criar):
    resposta = criar(valor="10.00")
    assert resposta.status_code == 201
    assert resposta.json()["valor"] == "10"


@pytest.mark.parametrize("valor", ["NaN", "Infinity", "-Infinity"])
def test_valor_nao_finito_e_rejeitado(criar, valor):
    assert criar(valor=valor).status_code == 422


@pytest.mark.parametrize(
    ("campos", "mensagem"),
    [
        ({"tipo": "inexistente"}, "Tipo de indicador inexistente: inexistente."),
        ({"codigo_cnae": CNAE}, "Indicadores municipais não recebem CNAE nem estabelecimento."),
        (
            {"tipo": "teste_por_cnae"},
            "Indicadores por CNAE exigem o código CNAE e não recebem estabelecimento.",
        ),
        (
            {"tipo": "teste_por_cnae", "codigo_cnae": "0000-0/00"},
            "CNAE não cadastrado no catálogo: 0000-0/00.",
        ),
    ],
)
def test_escopo_e_catalogo_sao_validados(criar, campos, mensagem):
    resposta = criar(**campos)
    assert resposta.status_code == 422
    assert resposta.json() == {"detail": mensagem}


@pytest.mark.parametrize("campos", [{"mes": 13}, {"ano": 1800}, {"codigo_cnae": "5510801"}])
def test_campos_com_formato_invalido_sao_rejeitados(criar, campos):
    assert criar(**campos).status_code == 422


def test_lancamento_duplicado_retorna_conflito(db, criar):
    assert criar().status_code == 201
    resposta = criar(valor="20")
    assert resposta.status_code == 409
    assert "Corrija o lançamento existente" in resposta.json()["detail"]
    # A transação continua utilizável após o conflito.
    assert criar(mes=2).status_code == 201
    assert total_indicadores(db) >= 2


def test_mesmo_tipo_e_periodo_em_cnae_diferente_nao_conflita(db, criar):
    db.execute(
        text("INSERT INTO setores (nome, slug, codigo_cnae) VALUES ('Outro', 'teste-2', '9999-9/02')")
    )
    assert criar(tipo="teste_por_cnae", codigo_cnae=CNAE).status_code == 201
    assert criar(tipo="teste_por_cnae", codigo_cnae="9999-9/02").status_code == 201


def test_correcao_atualiza_apenas_os_campos_enviados(client, admin_headers, criar):
    criado = criar(tipo="teste_percentual", valor="60.5").json()
    resposta = client.patch(
        f"{URL}/{criado['id']}", json={"valor": "61.75"}, headers=admin_headers
    )
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["valor"] == "61.75"
    assert {k: v for k, v in corpo.items() if k != "valor"} == {
        k: v for k, v in criado.items() if k != "valor"
    }


def test_correcao_e_revalidada(client, admin_headers, criar):
    criado = criar(tipo="teste_percentual", valor="60.5").json()
    url = f"{URL}/{criado['id']}"
    assert client.patch(url, json={"valor": "101"}, headers=admin_headers).status_code == 422
    assert client.patch(url, json={"fonte": " "}, headers=admin_headers).status_code == 422
    assert client.patch(url, json={"fonte": None}, headers=admin_headers).status_code == 422
    # 60.5 é um percentual válido, mas não uma quantidade.
    assert client.patch(url, json={"tipo": "teste_contagem"}, headers=admin_headers).status_code == 422
    assert client.get(url, headers=admin_headers).json() == criado


def test_correcao_que_colide_retorna_conflito(client, admin_headers, criar):
    criar(mes=1)
    segundo = criar(mes=2).json()
    resposta = client.patch(f"{URL}/{segundo['id']}", json={"mes": 1}, headers=admin_headers)
    assert resposta.status_code == 409


def test_correcao_para_periodo_anual(client, admin_headers, criar):
    criado = criar(mes=5).json()
    resposta = client.patch(f"{URL}/{criado['id']}", json={"mes": None}, headers=admin_headers)
    assert resposta.status_code == 200
    assert resposta.json()["mes"] is None


def test_publicacao_registra_o_responsavel(client, admin_headers, admin, criar):
    criado = criar().json()
    resposta = client.post(f"{URL}/{criado['id']}/publicar", headers=admin_headers)
    assert resposta.status_code == 200
    assert resposta.json()["status"] == "publicado"
    assert resposta.json()["validado_por"] == admin

    # Publicar novamente não altera o lançamento.
    novamente = client.post(f"{URL}/{criado['id']}/publicar", headers=admin_headers)
    assert novamente.json() == resposta.json()


def test_correcao_de_publicado_mantem_publicado(db, client, admin_headers, criar):
    criado = criar().json()
    client.post(f"{URL}/{criado['id']}/publicar", headers=admin_headers)
    outro = db.execute(
        text(
            """
            INSERT INTO usuarios (nome, email, papel, senha_hash)
            VALUES ('Outra admin', 'outra@c317.local', 'admin', :hash) RETURNING id
            """
        ),
        {"hash": hash_password("qualquer-senha")},
    ).scalar_one()
    resposta = client.patch(
        f"{URL}/{criado['id']}", json={"valor": "11"},
        headers=auth(create_access_token(outro)),
    )
    assert resposta.json()["status"] == "publicado"
    assert resposta.json()["validado_por"] == outro


def test_listagem_administrativa_filtra_por_status(client, admin_headers, criar):
    rascunho = criar(mes=1).json()
    publicado = criar(mes=2).json()
    client.post(f"{URL}/{publicado['id']}/publicar", headers=admin_headers)

    def ids(status=None):
        params = {"status": status} if status else {}
        resposta = client.get(URL, params=params, headers=admin_headers)
        assert resposta.status_code == 200
        return {item["id"] for item in resposta.json()}

    assert {rascunho["id"], publicado["id"]} <= ids()
    assert rascunho["id"] in ids("rascunho") and publicado["id"] not in ids("rascunho")
    assert publicado["id"] in ids("publicado") and rascunho["id"] not in ids("publicado")
    assert client.get(URL, params={"status": "outro"}, headers=admin_headers).status_code == 422


@pytest.mark.parametrize("metodo", ["get", "patch", "publicar"])
def test_lancamento_inexistente_retorna_404(client, admin_headers, catalogo, metodo):
    url = f"{URL}/999999999"
    if metodo == "get":
        resposta = client.get(url, headers=admin_headers)
    elif metodo == "patch":
        resposta = client.patch(url, json={"valor": "1"}, headers=admin_headers)
    else:
        resposta = client.post(f"{url}/publicar", headers=admin_headers)
    assert resposta.status_code == 404


def test_chamada_direta_sem_autenticacao_nao_publica_dados(db, client, admin_headers, criar):
    criado = criar().json()
    antes = total_indicadores(db)

    assert client.post(URL, json=lancamento(mes=3)).status_code == 401
    assert client.patch(f"{URL}/{criado['id']}", json={"valor": "99"}).status_code == 401
    assert client.post(f"{URL}/{criado['id']}/publicar").status_code == 401
    assert client.get(URL).status_code == 401

    assert total_indicadores(db) == antes
    atual = client.get(f"{URL}/{criado['id']}", headers=admin_headers).json()
    assert atual == criado


def test_usuario_fora_da_equipe_administrativa_nao_publica(db, client, criar):
    criado = criar().json()
    leitor = db.execute(
        text(
            """
            INSERT INTO usuarios (nome, email, papel) VALUES ('Leitor', 'leitor@c317.local', 'leitor')
            RETURNING id
            """
        )
    ).scalar_one()
    headers = auth(create_access_token(leitor))
    assert client.post(f"{URL}/{criado['id']}/publicar", headers=headers).status_code == 403
    assert client.post(URL, json=lancamento(mes=4), headers=headers).status_code == 403
