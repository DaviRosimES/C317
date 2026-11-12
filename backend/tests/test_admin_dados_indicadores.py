"""V9: administração dos Dados do indicador (cadastro, correção e estados)."""

import pytest
from sqlalchemy import text

from app.core.security import create_access_token
from tests.conftest import auth

DADOS = "/api/v1/admin/dados-indicadores"
DEFINICOES = "/api/v1/admin/definicoes-indicadores"
CONSULTA = "/api/v1/consulta"
SANTA_RITA = "t_santa_rita_do_sapucai_831ff035c3"
ACOLHEDORA = "i_cidade_vista_como_acolhedora_fc339b5db8"
MORADORES = "4152c38ca7d8e01a414d268629189bebb381815c979fdb82c1b31a0ddb25735b"
VISITANTES_CAT = "c_publico_pesquisa_visitantes_9f2693b03c"
HACKTOWN = "f_relatorio_ot_no_004_2025_impacto_turistico_hacktown_2025_sec_d2e1f26742"
ATIVIDADES = "i_atividades_economicas_cnae_cadastradas_no_municipio_232f732270"  # inteira, só anual, sem categoria
SEBRAE = "f_painel_inteligencia_sebrae_mapa_sebrae_de_empresas_no_brasil_69ecd72ebb"


@pytest.fixture
def novo():
    return {
        "indicador_codigo": ATIVIDADES,
        "referencia": {"tipo": "anual", "ano_inicio": 2027},
        "valor": "1520",
        "fonte_codigo": SEBRAE,
        "notas": ["Contagem informada pela fonte."],
    }


def criar(client, headers, corpo):
    return client.post(DADOS, json=corpo, headers=headers)


def acao(client, headers, dado_id, nome, corpo=None):
    return client.post(f"{DADOS}/{dado_id}/{nome}", json=corpo, headers=headers)


def publico(client, dado_id) -> bool:
    return client.get(f"{CONSULTA}/dados/{dado_id}").status_code == 200


# Cadastro


def test_cadastro_cria_rascunho_em_santa_rita(client, admin_headers, dados_m7, novo):
    resposta = criar(client, admin_headers, {**novo, "valor": "1520,0"})
    assert resposta.status_code == 201, resposta.text
    corpo = resposta.json()
    assert len(corpo["id"]) == 64
    assert corpo["status"] == "rascunho" and corpo["arquivado"] is False
    assert corpo["territorio"]["codigo"] == SANTA_RITA
    assert corpo["unidade"]["nome"] == "atividades"
    assert corpo["valor"] == "1520.0"  # vírgula aceita, casas preservadas
    assert corpo["referencia"] == {
        "tipo": "anual", "ano_inicio": 2027, "ano_fim": 2027, "mes": None, "data_extracao": None,
        "chave": "anual-2027", "rotulo": "2027 — anual",
    }
    assert corpo["origens"] == [] and corpo["visivel_publicamente"] is False
    assert not publico(client, corpo["id"])


def test_zero_e_valido(client, admin_headers, dados_m7, novo):
    assert criar(client, admin_headers, {**novo, "valor": "0"}).json()["valor"] == "0"


@pytest.mark.parametrize(
    ("alteracao", "trecho"),
    [
        ({"valor": 1520}, "texto decimal"),
        ({"valor": "-1"}, "não negativo"),
        ({"valor": "1.520,5"}, "sem separador de milhar"),
        ({"valor": "1520.5"}, "exige valor inteiro"),
        ({"referencia": {"tipo": "mensal", "ano_inicio": 2027, "mes": 3}}, "não aceita referência mensal"),
        ({"referencia": {"tipo": "anual", "ano_inicio": 2027, "mes": 3}}, "Mês só é informado"),
        ({"referencia": {"tipo": "acumulada", "ano_inicio": 2020}}, "ano inicial e o final"),
        ({"referencia": None}, "referencia"),
        ({"categoria_codigo": VISITANTES_CAT}, "classificação não aceita"),
        ({"categoria_codigo": "c_inexistente"}, "Categoria desconhecida."),
        ({"fonte_codigo": "f_inexistente"}, "Fonte desconhecida."),
        ({"indicador_codigo": "i_inexistente"}, "Indicador desconhecido."),
        ({"territorio_codigo": "t_outra_cidade"}, "territorio_codigo"),
        ({"status": "publicado"}, "status"),
    ],
)
def test_cadastro_invalido(client, admin_headers, dados_m7, novo, alteracao, trecho):
    resposta = criar(client, admin_headers, {**novo, **alteracao})
    assert resposta.status_code == 422, resposta.text
    assert trecho in resposta.text


def test_categoria_obrigatoria_e_maximo_da_unidade(client, admin_headers, dados_m7):
    base = {
        "indicador_codigo": ACOLHEDORA, "referencia": {"tipo": "anual", "ano_inicio": 2026},
        "fonte_codigo": HACKTOWN, "valor": "50",
    }
    sem_categoria = criar(client, admin_headers, base)
    assert "exige uma categoria" in sem_categoria.json()["detail"]
    acima = criar(client, admin_headers, {**base, "categoria_codigo": VISITANTES_CAT, "valor": "100.01"})
    assert "máximo da unidade" in acima.json()["detail"]
    assert criar(client, admin_headers, {**base, "categoria_codigo": VISITANTES_CAT}).status_code == 201


def test_combinacao_duplicada_e_recusada(client, admin_headers, dados_m7):
    resposta = criar(
        client,
        admin_headers,
        {
            "indicador_codigo": ACOLHEDORA, "categoria_codigo": "c_publico_pesquisa_moradores_ad535c7f5e",
            "referencia": {"tipo": "anual", "ano_inicio": 2025}, "fonte_codigo": HACKTOWN, "valor": "1",
        },
    )
    assert resposta.status_code == 409
    assert resposta.json()["detail"].startswith("Já existe um dado para este indicador, categoria, referência e fonte.")
    assert MORADORES in resposta.json()["detail"]


def test_indicador_arquivado_nao_recebe_dados(client, admin_headers, dados_m7, novo):
    client.post(f"{DEFINICOES}/{ATIVIDADES}/arquivar", headers=admin_headers)
    resposta = criar(client, admin_headers, novo)
    assert resposta.status_code == 409
    assert "indicador está arquivado" in resposta.json()["detail"]


# Correção


def test_correcao_preserva_id(client, admin_headers, dados_m7):
    resposta = client.patch(
        f"{DADOS}/{MORADORES}",
        json={"valor": "44,7", "referencia": {"tipo": "anual", "ano_inicio": 2026}, "notas": ["Revisão da fonte."]},
        headers=admin_headers,
    )
    assert resposta.status_code == 200, resposta.text
    corpo = resposta.json()
    assert (corpo["id"], corpo["valor"], corpo["referencia"]["chave"]) == (MORADORES, "44.7", "anual-2026")
    assert corpo["notas"] == ["Revisão da fonte."]
    assert corpo["status"] == "rascunho"


def test_correcao_para_combinacao_existente_e_recusada(client, admin_headers, dados_m7):
    resposta = client.patch(
        f"{DADOS}/{MORADORES}", json={"categoria_codigo": VISITANTES_CAT}, headers=admin_headers
    )
    assert resposta.status_code == 409
    assert client.get(f"{DADOS}/{MORADORES}", headers=admin_headers).json()["categoria"]["nome"] == "Moradores"


@pytest.mark.parametrize(
    "corpo",
    [{"indicador_codigo": ATIVIDADES}, {"valor": None}, {"fonte_codigo": None}, {"referencia": None}, {"id": "x"}],
)
def test_correcao_invalida(client, admin_headers, dados_m7, corpo):
    assert client.patch(f"{DADOS}/{MORADORES}", json=corpo, headers=admin_headers).status_code == 422


def test_edicao_de_publicado_vale_na_hora(client, admin_headers, dados_m7):
    acao(client, admin_headers, MORADORES, "publicar")
    client.patch(f"{DADOS}/{MORADORES}", json={"valor": "45"}, headers=admin_headers)
    assert client.get(f"{CONSULTA}/dados/{MORADORES}").json()["valor"] == "45"


def test_edicao_de_rascunho_continua_privada(client, admin_headers, dados_m7):
    corpo = client.patch(f"{DADOS}/{MORADORES}", json={"valor": "45"}, headers=admin_headers).json()
    assert corpo["status"] == "rascunho" and not publico(client, MORADORES)


# Estados


def test_publicar_e_despublicar(client, admin_headers, dados_m7):
    publicado = acao(client, admin_headers, MORADORES, "publicar").json()
    assert (publicado["status"], publicado["visivel_publicamente"]) == ("publicado", True)
    assert publico(client, MORADORES)
    rascunho = acao(client, admin_headers, MORADORES, "despublicar").json()
    assert (rascunho["status"], rascunho["valor"]) == ("rascunho", "44.5")
    assert not publico(client, MORADORES)


@pytest.mark.parametrize("publicar", [True, False])
def test_arquivar_e_restaurar_preservam_status_e_bloqueio(client, admin_headers, dados_m7, publicar):
    if publicar:
        acao(client, admin_headers, MORADORES, "publicar")
    acao(client, admin_headers, MORADORES, "bloquear", {"motivo": "Amostra insuficiente"})
    status = "publicado" if publicar else "rascunho"

    arquivado = acao(client, admin_headers, MORADORES, "arquivar").json()
    assert (arquivado["status"], arquivado["arquivado"], arquivado["divulgacao_bloqueada"]) == (status, True, True)
    restaurado = acao(client, admin_headers, MORADORES, "restaurar").json()
    assert (restaurado["status"], restaurado["arquivado"]) == (status, False)
    assert restaurado["motivo_bloqueio"] == "Amostra insuficiente"
    assert not publico(client, MORADORES)  # bloqueio continua

    acao(client, admin_headers, MORADORES, "desbloquear")
    assert publico(client, MORADORES) is publicar


def test_arquivado_precisa_ser_restaurado(client, admin_headers, dados_m7):
    acao(client, admin_headers, MORADORES, "arquivar")
    tentativas = [
        client.patch(f"{DADOS}/{MORADORES}", json={"valor": "1"}, headers=admin_headers),
        acao(client, admin_headers, MORADORES, "publicar"),
        acao(client, admin_headers, MORADORES, "despublicar"),
        acao(client, admin_headers, MORADORES, "bloquear", {"motivo": "x"}),
    ]
    for resposta in tentativas:
        assert resposta.status_code == 409, resposta.text
        assert "Restaure-o" in resposta.json()["detail"]


def test_bloqueado_nao_e_publicado(client, admin_headers, dados_m7):
    acao(client, admin_headers, MORADORES, "bloquear", {"motivo": "Restrição da fonte"})
    resposta = acao(client, admin_headers, MORADORES, "publicar")
    assert resposta.status_code == 409 and "bloqueada" in resposta.json()["detail"]
    assert acao(client, admin_headers, MORADORES, "bloquear", {"motivo": "  "}).status_code == 422


def test_arquivar_indicador_oculta_sem_reescrever_os_dados(client, db, admin_headers, dados_m7):
    acao(client, admin_headers, MORADORES, "publicar")
    visitantes = db.execute(
        text("SELECT id FROM dados_indicadores WHERE categoria_codigo = :c AND indicador_codigo = :i"),
        {"c": VISITANTES_CAT, "i": ACOLHEDORA},
    ).scalar_one()
    acao(client, admin_headers, visitantes, "publicar")
    acao(client, admin_headers, visitantes, "arquivar")

    client.post(f"{DEFINICOES}/{ACOLHEDORA}/arquivar", headers=admin_headers)
    dado = client.get(f"{DADOS}/{MORADORES}", headers=admin_headers).json()
    assert (dado["status"], dado["arquivado"], dado["indicador"]["arquivado"]) == ("publicado", False, True)
    assert dado["visivel_publicamente"] is False and not publico(client, MORADORES)
    assert acao(client, admin_headers, MORADORES, "publicar").status_code == 409

    client.post(f"{DEFINICOES}/{ACOLHEDORA}/restaurar", headers=admin_headers)
    assert publico(client, MORADORES)
    # Arquivado separadamente continua arquivado.
    assert client.get(f"{DADOS}/{visitantes}", headers=admin_headers).json()["arquivado"] is True


# Listagem e autenticação


def test_listagem_administrativa(client, admin_headers, dados_m7):
    acao(client, admin_headers, MORADORES, "arquivar")

    def ids(**params):
        resposta = client.get(DADOS, params={"indicador": ACOLHEDORA, **params}, headers=admin_headers)
        assert resposta.status_code == 200, resposta.text
        return {d["id"] for d in resposta.json()}

    assert len(ids(situacao="todos")) == 3
    assert MORADORES not in ids() and ids(situacao="arquivados") == {MORADORES}
    assert ids(status="publicado") == set()
    assert len(client.get(DADOS, headers=admin_headers).json()) == 302
    assert client.get(DADOS, params={"indicador": "i_x"}, headers=admin_headers).status_code == 422


def test_inexistente(client, admin_headers, dados_m7):
    for resposta in (
        client.get(f"{DADOS}/{'0' * 64}", headers=admin_headers),
        client.patch(f"{DADOS}/{'0' * 64}", json={"valor": "1"}, headers=admin_headers),
        acao(client, admin_headers, "0" * 64, "arquivar"),
    ):
        assert resposta.status_code == 404
        assert resposta.json() == {"detail": "Dado não encontrado."}


def test_exige_administrador(client, db, dados_m7, novo):
    leitor = db.execute(
        text(
            "INSERT INTO usuarios (nome, email, papel) "
            "VALUES ('Cristiano Ronaldo', 'cristiano.ronaldo@example.test', 'leitor') RETURNING id"
        )
    ).scalar_one()
    for headers, esperado in (({}, 401), (auth(create_access_token(leitor)), 403)):
        assert client.get(DADOS, headers=headers).status_code == esperado
        assert client.get(f"{DADOS}/{MORADORES}", headers=headers).status_code == esperado
        assert criar(client, headers, novo).status_code == esperado
        assert client.patch(f"{DADOS}/{MORADORES}", json={"valor": "1"}, headers=headers).status_code == esperado
        for nome in ("publicar", "despublicar", "arquivar", "restaurar", "desbloquear"):
            assert acao(client, headers, MORADORES, nome).status_code == esperado
        assert acao(client, headers, MORADORES, "bloquear", {"motivo": "x"}).status_code == esperado
