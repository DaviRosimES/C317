"""V7: definições de indicadores, Setores do Observatório e catálogos."""

import pytest
from sqlalchemy import text

from app.core.codigos import gerar_codigo
from app.core.security import create_access_token
from tests.conftest import auth

DEFINICOES = "/api/v1/admin/definicoes-indicadores"
CATALOGOS = "/api/v1/admin/catalogos"

ACOLHEDORA = "i_cidade_vista_como_acolhedora_fc339b5db8"
PI_DEPOSITOS = "i_depositos_de_patentes_de_invencao_pi_1bc517ff0d"
MEIOS_HOSPEDAGEM = "i_meios_de_hospedagem_10d688bcf7"
ECONOMIA_CRIATIVA = "tema_economia_criativa_ca3ef6a61b"
TURISMO = "tema_turismo_f09ebc929b"
PATENTES = "u_patentes_b87194e2d8"


@pytest.fixture
def novo(definicoes_m7):
    unidade = next(c for c, u in definicoes_m7["unidades"].items() if u["nome"] == "pessoas")
    return {
        "nome": "Visitantes atendidos no centro de informações",
        "definicao": "Quantidade de visitantes atendidos, conforme o registro recebido.",
        "unidade_codigo": unidade,
        "setores": [TURISMO],
        "tipos_referencia_permitidos": ["anual", "mensal"],
        "classificacoes_permitidas": [],
        "aceita_sem_categoria": True,
    }


def listar(client, headers, **params):
    resposta = client.get(DEFINICOES, params=params, headers=headers)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def corrigir(client, headers, codigo, corpo):
    return client.patch(f"{DEFINICOES}/{codigo}", json=corpo, headers=headers)


# Pacote preparado


def test_representa_61_definicoes_e_67_associacoes(client, admin_headers, definicoes_m7):
    definicoes = listar(client, admin_headers, situacao="todos")
    assert len(definicoes) == 61
    assert sum(len(d["setores"]) for d in definicoes) == 67
    assert sum(len(d["setores"]) > 1 for d in definicoes) == 6
    assert all(d["unidade"] and d["setores"] and d["tipos_referencia_permitidos"] for d in definicoes)


def test_definicao_completa(client, admin_headers, definicoes_m7):
    item = client.get(f"{DEFINICOES}/{ACOLHEDORA}", headers=admin_headers).json()
    assert item["nome"] == "Cidade vista como: Acolhedora"
    assert item["unidade"]["nome"] == "% dos entrevistados"
    assert item["unidade"]["maximo"] == 100
    assert item["setores"] == [{"codigo": ECONOMIA_CRIATIVA, "nome": "Economia criativa"}]
    assert item["tipos_referencia_permitidos"] == ["anual"]
    assert item["classificacoes_permitidas"] == [{"codigo": "publico_pesquisa", "nome": "Público da pesquisa"}]
    assert item["aceita_sem_categoria"] is False and item["arquivado"] is False
    assert item["nota_metodologica"]


def test_setores_reaproveitam_os_codigos_dos_temas(client, admin_headers, definicoes_m7, pacote):
    setores = client.get(CATALOGOS, headers=admin_headers).json()["setores"]
    assert {s["codigo"] for s in setores} == set(pacote[1]["temas"])
    assert {s["nome"] for s in setores} == {
        "Dados gerais", "Economia criativa", "Eventos", "Pesquisa e inovação", "Turismo", "Vale da Eletrônica",
    }
    assert all(s["em_uso"] for s in setores)


def test_filtro_por_setor_traz_cada_indicador_uma_vez(client, admin_headers, definicoes_m7):
    turismo = listar(client, admin_headers, setor=TURISMO)
    assert len(turismo) == 15
    assert len({d["codigo"] for d in turismo}) == 15
    assert listar(client, admin_headers, busca="acolhedora")[0]["codigo"] == ACOLHEDORA
    assert client.get(DEFINICOES, params={"setor": "tema_inexistente"}, headers=admin_headers).status_code == 422


# Cadastro


def test_cadastro_gera_codigo_estavel(client, admin_headers, novo):
    resposta = client.post(DEFINICOES, json=novo, headers=admin_headers)
    assert resposta.status_code == 201, resposta.text
    corpo = resposta.json()
    assert corpo["codigo"] == gerar_codigo("i", novo["nome"])
    assert corpo["arquivado"] is False and corpo["total_dados"] == 0
    assert corpo["setores"] == [{"codigo": TURISMO, "nome": "Turismo"}]
    assert corpo["codigo"] in {d["codigo"] for d in listar(client, admin_headers)}


def test_codigo_nao_reaproveita_o_de_dados_existentes(client, db, admin_headers, carregado, novo):
    """Um nome que gera o código de dados antigos recebe outro código, sem adotar esses dados."""
    db.execute(text("DELETE FROM indicadores_definicoes WHERE codigo = :c"), {"c": PI_DEPOSITOS})
    corpo = client.post(
        DEFINICOES, json={**novo, "nome": "Depósitos de patentes de invenção (PI)"}, headers=admin_headers
    ).json()
    assert corpo["codigo"] != PI_DEPOSITOS and corpo["total_dados"] == 0


@pytest.mark.parametrize(
    ("alteracao", "mensagem"),
    [
        ({"unidade_codigo": "u_inexistente"}, "Código desconhecido em unidade_codigo: u_inexistente."),
        ({"setores": ["tema_inexistente"]}, "Código desconhecido em setores: tema_inexistente."),
        ({"classificacoes_permitidas": ["x"]}, "Código desconhecido em classificacoes_permitidas: x."),
        (
            {"aceita_sem_categoria": False},
            "Um indicador que não aceita dado sem categoria precisa de ao menos uma classificação.",
        ),
    ],
)
def test_cadastro_valida_catalogos_e_compatibilidade(client, admin_headers, novo, alteracao, mensagem):
    resposta = client.post(DEFINICOES, json={**novo, **alteracao}, headers=admin_headers)
    assert resposta.status_code == 422
    assert resposta.json() == {"detail": mensagem}


@pytest.mark.parametrize(
    "alteracao",
    [
        {"setores": []},
        {"tipos_referencia_permitidos": []},
        {"tipos_referencia_permitidos": ["desconhecido"]},
        {"nome": "  "},
        {"definicao": ""},
        {"codigo": "i_escolhido"},
    ],
)
def test_cadastro_com_campos_invalidos(client, admin_headers, novo, alteracao):
    assert client.post(DEFINICOES, json={**novo, **alteracao}, headers=admin_headers).status_code == 422


def test_sem_unidade_ou_setor_e_recusado(client, admin_headers, novo):
    for campo in ("unidade_codigo", "setores"):
        corpo = {k: v for k, v in novo.items() if k != campo}
        assert client.post(DEFINICOES, json=corpo, headers=admin_headers).status_code == 422


def test_nome_duplicado(client, admin_headers, novo):
    resposta = client.post(
        DEFINICOES, json={**novo, "nome": "cidade vista como: ACOLHEDORA"}, headers=admin_headers
    )
    assert resposta.status_code == 409
    assert resposta.json() == {"detail": "Já existe um indicador com este nome, ativo ou arquivado."}
    assert corrigir(client, admin_headers, PI_DEPOSITOS, {"nome": "Cidade vista como: Acolhedora"}).status_code == 409


# Edição


def test_renomear_preserva_codigo(client, admin_headers, definicoes_m7):
    resposta = corrigir(client, admin_headers, ACOLHEDORA, {"nome": "Cidade percebida como acolhedora"})
    assert resposta.status_code == 200
    assert resposta.json()["codigo"] == ACOLHEDORA
    assert resposta.json()["nome"] == "Cidade percebida como acolhedora"


def test_edicao_parcial_e_nota(client, admin_headers, definicoes_m7):
    corpo = corrigir(
        client, admin_headers, ACOLHEDORA, {"setores": [ECONOMIA_CRIATIVA, TURISMO], "nota_metodologica": None}
    ).json()
    assert {s["codigo"] for s in corpo["setores"]} == {ECONOMIA_CRIATIVA, TURISMO}
    assert corpo["nota_metodologica"] is None
    assert corpo["unidade"]["nome"] == "% dos entrevistados"


@pytest.mark.parametrize("corpo", [{}, {"nome": None}, {"setores": None}, {"setores": []}, {"codigo": "x"}])
def test_edicao_invalida(client, admin_headers, definicoes_m7, corpo):
    assert corrigir(client, admin_headers, ACOLHEDORA, corpo).status_code == 422


@pytest.mark.parametrize(
    ("indicador", "alteracao", "trecho"),
    [
        (PI_DEPOSITOS, {"unidade_codigo": "u_pessoas_4ee4c52930"}, "na unidade patentes"),
        (PI_DEPOSITOS, {"tipos_referencia_permitidos": ["anual"]}, "com referência acumulada"),
        (
            PI_DEPOSITOS,
            {"aceita_sem_categoria": False, "classificacoes_permitidas": ["evento"]},
            "sem categoria",
        ),
        (
            MEIOS_HOSPEDAGEM,
            {"classificacoes_permitidas": ["zona_hospedagem"]},
            "na classificação Categoria de hospedagem",
        ),
    ],
)
def test_alteracao_que_invalida_dados_e_recusada(
    client, admin_headers, dados_m7, definicoes_m7, indicador, alteracao, trecho
):
    resposta = corrigir(client, admin_headers, indicador, alteracao)
    assert resposta.status_code == 409, resposta.text
    detalhe = resposta.json()["detail"]
    assert detalhe.startswith("A alteração invalidaria dados existentes, inclusive arquivados:")
    assert trecho in detalhe


def test_correcao_descritiva_com_dados_vinculados(client, admin_headers, dados_m7, definicoes_m7):
    resposta = corrigir(client, admin_headers, ACOLHEDORA, {"definicao": "Texto revisado da definição."})
    assert resposta.status_code == 200, resposta.text
    assert resposta.json()["total_dados"] > 0


def test_ampliar_compatibilidades_e_permitido(client, admin_headers, dados_m7, definicoes_m7):
    corpo = corrigir(
        client, admin_headers, PI_DEPOSITOS, {"tipos_referencia_permitidos": ["anual", "acumulada", "mensal"]}
    ).json()
    assert set(corpo["tipos_referencia_permitidos"]) == {"anual", "acumulada", "mensal"}


# Arquivamento


def test_arquivar_e_restaurar(client, db, admin_headers, dados_m7, definicoes_m7):
    estados = text(
        "SELECT status, arquivado, count(*) FROM dados_indicadores WHERE indicador_codigo = :c GROUP BY 1, 2"
    )
    antes = db.execute(estados, {"c": PI_DEPOSITOS}).all()

    arquivado = client.post(f"{DEFINICOES}/{PI_DEPOSITOS}/arquivar", headers=admin_headers).json()
    assert arquivado["arquivado"] is True
    assert PI_DEPOSITOS not in {d["codigo"] for d in listar(client, admin_headers)}
    assert PI_DEPOSITOS in {d["codigo"] for d in listar(client, admin_headers, situacao="arquivados")}
    # Os dados não são reescritos ao arquivar o indicador.
    assert db.execute(estados, {"c": PI_DEPOSITOS}).all() == antes

    editar = corrigir(client, admin_headers, PI_DEPOSITOS, {"nome": "Outro nome"})
    assert editar.status_code == 409
    assert editar.json() == {"detail": "O indicador está arquivado. Restaure-o antes de editar."}

    restaurado = client.post(f"{DEFINICOES}/{PI_DEPOSITOS}/restaurar", headers=admin_headers).json()
    assert restaurado["arquivado"] is False
    assert corrigir(client, admin_headers, PI_DEPOSITOS, {"nome": "Outro nome"}).status_code == 200


@pytest.mark.parametrize(
    ("metodo", "sufixo", "corpo"),
    [("get", "", None), ("patch", "", {"nome": "x"}), ("post", "/arquivar", None), ("post", "/restaurar", None)],
)
def test_definicao_inexistente(client, admin_headers, definicoes_m7, metodo, sufixo, corpo):
    resposta = client.request(metodo, f"{DEFINICOES}/i_inexistente{sufixo}", json=corpo, headers=admin_headers)
    assert resposta.status_code == 404


# Catálogos


def test_catalogos(client, admin_headers, definicoes_m7):
    catalogos = client.get(CATALOGOS, headers=admin_headers).json()
    assert {chave: len(itens) for chave, itens in catalogos.items()} == {
        "setores": 6, "unidades": 22, "fontes": 15, "classificacoes": 18, "categorias": 80,
    }
    indice = next(u for u in catalogos["unidades"] if u["nome"] == "índice (0 a 1)")
    assert indice["maximo"] == 1 and indice["inteira"] is False
    assert all(c["codigo_cnae"] is None for c in catalogos["categorias"])


def test_novo_setor_aparece_sem_alterar_codigo(client, db, admin_headers, novo):
    db.execute(text("INSERT INTO setores_observatorio VALUES ('setor_novo', 'Esportes')"))
    assert "setor_novo" in {s["codigo"] for s in client.get(CATALOGOS, headers=admin_headers).json()["setores"]}
    assert client.post(DEFINICOES, json={**novo, "setores": ["setor_novo"]}, headers=admin_headers).status_code == 201


def test_cadastro_de_fonte(client, admin_headers, definicoes_m7):
    corpo = {"nome": "Pesquisa de satisfação 2026", "links": ["https://exemplo.gov.br/pesquisa"]}
    criada = client.post(f"{CATALOGOS}/fontes", json=corpo, headers=admin_headers)
    assert criada.status_code == 201
    fonte = criada.json()
    assert fonte["codigo"] == gerar_codigo("f", corpo["nome"]) and fonte["links"] == corpo["links"]
    assert fonte["em_uso"] is False

    assert client.post(f"{CATALOGOS}/fontes", json=corpo, headers=admin_headers).status_code == 409
    assert client.post(
        f"{CATALOGOS}/fontes", json={"nome": "Outra", "links": ["ftp://x"]}, headers=admin_headers
    ).status_code == 422

    corrigida = client.patch(
        f"{CATALOGOS}/fontes/{fonte['codigo']}", json={"nome": "Pesquisa de satisfação (2026)"}, headers=admin_headers
    ).json()
    assert corrigida["codigo"] == fonte["codigo"] and corrigida["links"] == corpo["links"]


def test_cadastro_de_classificacao_e_categoria(client, admin_headers, novo):
    classificacao = client.post(
        f"{CATALOGOS}/classificacoes", json={"nome": "Faixa de renda"}, headers=admin_headers
    ).json()
    categoria = client.post(
        f"{CATALOGOS}/categorias",
        json={"nome": "Até 2 salários", "classificacao_codigo": classificacao["codigo"]},
        headers=admin_headers,
    )
    assert categoria.status_code == 201
    assert categoria.json()["classificacao_codigo"] == classificacao["codigo"]

    repetida = client.post(
        f"{CATALOGOS}/categorias",
        json={"nome": "até 2 SALÁRIOS", "classificacao_codigo": classificacao["codigo"]},
        headers=admin_headers,
    )
    assert repetida.status_code == 409
    desconhecida = client.post(
        f"{CATALOGOS}/categorias", json={"nome": "X", "classificacao_codigo": "nao_existe"}, headers=admin_headers
    )
    assert desconhecida.status_code == 422

    definicao = client.post(
        DEFINICOES,
        json={**novo, "aceita_sem_categoria": False, "classificacoes_permitidas": [classificacao["codigo"]]},
        headers=admin_headers,
    )
    assert definicao.json()["classificacoes_permitidas"] == [{"codigo": classificacao["codigo"], "nome": "Faixa de renda"}]


def test_categoria_em_uso_preserva_o_significado(client, admin_headers, dados_m7, definicoes_m7):
    hotel = next(
        c for c, item in definicoes_m7["categorias"].items()
        if item["nome"] == "Hotel" and item["classificacao"] == "categoria_hospedagem"
    )
    url = f"{CATALOGOS}/categorias/{hotel}"
    assert client.patch(url, json={"classificacao_codigo": "zona_hospedagem"}, headers=admin_headers).status_code == 409
    assert client.patch(url, json={"codigo_cnae": "5510-8/01"}, headers=admin_headers).status_code == 409
    renomeada = client.patch(url, json={"nome": "Hotéis"}, headers=admin_headers)
    assert renomeada.status_code == 200 and renomeada.json()["em_uso"] is True


def test_categoria_fora_de_uso_pode_mudar(client, admin_headers, definicoes_m7):
    criada = client.post(
        f"{CATALOGOS}/categorias", json={"nome": "Glamping", "classificacao_codigo": "categoria_hospedagem"},
        headers=admin_headers,
    ).json()
    corrigida = client.patch(
        f"{CATALOGOS}/categorias/{criada['codigo']}", json={"classificacao_codigo": "zona_hospedagem"},
        headers=admin_headers,
    )
    assert corrigida.status_code == 200
    assert corrigida.json()["classificacao_codigo"] == "zona_hospedagem"


# Autenticação


def test_exige_administrador(client, db, definicoes_m7, novo):
    leitor = db.execute(
        text(
            "INSERT INTO usuarios (nome, email, papel) "
            "VALUES ('Cristiano Ronaldo', 'cristiano.ronaldo@example.test', 'leitor') RETURNING id"
        )
    ).scalar_one()
    for headers, esperado in (({}, 401), (auth(create_access_token(leitor)), 403)):
        assert client.get(DEFINICOES, headers=headers).status_code == esperado
        assert client.post(DEFINICOES, json=novo, headers=headers).status_code == esperado
        assert client.patch(f"{DEFINICOES}/{ACOLHEDORA}", json={"nome": "x"}, headers=headers).status_code == esperado
        assert client.post(f"{DEFINICOES}/{ACOLHEDORA}/arquivar", headers=headers).status_code == esperado
        assert client.get(CATALOGOS, headers=headers).status_code == esperado
        assert client.post(f"{CATALOGOS}/fontes", json={"nome": "x"}, headers=headers).status_code == esperado
