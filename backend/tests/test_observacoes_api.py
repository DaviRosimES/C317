"""V6: consulta pública e manutenção administrativa das observações da M6."""

import json

import pytest
from sqlalchemy import text

from app.core.contrato_m6 import identidade
from app.core.security import create_access_token, hash_password
from tests.conftest import auth

PUBLICA = "/api/v1/observacoes"
ADMIN = "/api/v1/admin/observacoes"

SRS = "t_santa_rita_do_sapucai_831ff035c3"
PI_DEPOSITOS = "i_depositos_de_patentes_de_invencao_pi_1bc517ff0d"
JANEIRO = "c_mes_citado_em_questionario_janeiro_181d6bf102"


@pytest.fixture
def observacoes(pacote):
    return {registro["id"]: registro for registro in pacote[2]}


@pytest.fixture
def publicar(client, admin_headers, carregado):
    def _publicar(*ids):
        for observacao_id in ids:
            resposta = client.post(f"{ADMIN}/{observacao_id}/publicar", headers=admin_headers)
            assert resposta.status_code == 200, resposta.text

    return _publicar


@pytest.fixture
def outro_admin(db):
    usuario = db.execute(
        text(
            """
            INSERT INTO usuarios (nome, email, papel, senha_hash)
            VALUES ('Outra admin', 'outra.admin.m6@c317.local', 'admin', :hash) RETURNING id
            """
        ),
        {"hash": hash_password("senha-outra-admin")},
    ).scalar_one()
    return usuario, auth(create_access_token(usuario))


def itens(resposta):
    assert resposta.status_code == 200, resposta.text
    return resposta.json()["itens"]


def ids_de(resposta):
    return {item["id"] for item in itens(resposta)}


def consultar(client, **params):
    return ids_de(client.get(PUBLICA, params=params))


def primeira(observacoes, **criterios):
    return next(
        registro
        for registro in observacoes.values()
        if all(_campo(registro, chave) == valor for chave, valor in criterios.items())
    )


def _campo(registro, chave):
    if chave.startswith("ref_"):
        return registro["referencia"].get(chave[4:])
    return registro.get(chave)


def pi_srs(observacoes, tipo="anual", inicio=2024):
    return primeira(
        observacoes, indicador_codigo=PI_DEPOSITOS, territorio_codigo=SRS,
        ref_tipo=tipo, ref_ano_inicio=inicio,
    )


def historico(client, admin_headers, observacao_id):
    return client.get(f"{ADMIN}/{observacao_id}", headers=admin_headers).json()["historico"]


# Somente publicados chegam ao público


def test_rascunhos_nao_aparecem_em_nenhum_endpoint_publico(client, carregado, pacote):
    qualquer = pacote[2][0]["id"]
    resposta = client.get(PUBLICA).json()
    assert resposta["itens"] == [] and resposta["total"] == 0
    assert client.get(f"{PUBLICA}/{qualquer}").status_code == 404
    assert client.get(f"{PUBLICA}/referencias").json() == []
    # O catálogo público não revela nomes que só existem em rascunho.
    assert all(lista == [] for lista in client.get(f"{PUBLICA}/catalogos").json().values())


def test_publicada_aparece_com_metadados(client, publicar, observacoes):
    registro = pi_srs(observacoes)
    publicar(registro["id"])

    item = client.get(f"{PUBLICA}/{registro['id']}").json()
    assert item["valor"] == "5"
    assert item["indicador"]["nome"] == "Depósitos de patentes de invenção (PI)"
    assert item["territorio"] == {"codigo": SRS, "nome": "Santa Rita do Sapucaí", "tipo": "municipio"}
    assert item["referencia"]["rotulo"] == "2024"
    assert item["unidade"]["nome"] == "patentes"
    assert item["fonte"]["nome"] and "links" in item["fonte"]
    assert item["temas"] and item["notas"] == registro["notas"]
    assert item["categoria"] is None and item["codigo_cnae"] is None
    assert "status" not in item and "proveniencias" not in item and "historico" not in item


def test_catalogo_publico_so_tem_itens_publicados(client, publicar, observacoes):
    registro = pi_srs(observacoes)
    publicar(registro["id"])
    catalogos = client.get(f"{PUBLICA}/catalogos").json()
    assert [i["codigo"] for i in catalogos["territorios"]] == [SRS]
    assert [i["codigo"] for i in catalogos["indicadores"]] == [PI_DEPOSITOS]
    assert {i["codigo"] for i in catalogos["temas"]} == set(registro["temas"])
    assert all(i["com_dados_publicados"] for lista in catalogos.values() for i in lista)


def test_catalogo_completo_e_administrativo(client, admin_headers, carregado, pacote):
    assert client.get(f"{ADMIN}/catalogos").status_code == 401
    completo = client.get(f"{ADMIN}/catalogos", headers=admin_headers).json()
    assert {tipo: len(lista) for tipo, lista in completo.items()} == {
        tipo: len(lista) for tipo, lista in pacote[1].items()
    }
    assert not any(i["com_dados_publicados"] for lista in completo.values() for i in lista)


def test_bloqueada_nao_vaza_por_nenhum_endpoint(client, admin_headers, publicar, observacoes):
    registro = primeira(observacoes, territorio_codigo=SRS)
    publicar(registro["id"])
    bloqueio = client.post(
        f"{ADMIN}/{registro['id']}/bloquear", json={"motivo": "Amostra insuficiente"}, headers=admin_headers
    )
    assert bloqueio.status_code == 200
    assert bloqueio.json()["status"] == "rascunho"

    assert itens(client.get(PUBLICA)) == []
    assert consultar(client, territorio=SRS) == set()
    assert client.get(f"{PUBLICA}/{registro['id']}").status_code == 404
    assert client.get(f"{PUBLICA}/referencias").json() == []
    assert all(lista == [] for lista in client.get(f"{PUBLICA}/catalogos").json().values())


def test_publicar_bloqueada_e_recusado_com_motivo(client, admin_headers, carregado, pacote):
    observacao_id = pacote[2][0]["id"]
    client.post(f"{ADMIN}/{observacao_id}/bloquear", json={"motivo": "Amostra insuficiente"}, headers=admin_headers)
    resposta = client.post(f"{ADMIN}/{observacao_id}/publicar", headers=admin_headers)
    assert resposta.status_code == 422
    assert "Amostra insuficiente" in resposta.json()["detail"]

    assert client.post(f"{ADMIN}/{observacao_id}/desbloquear", headers=admin_headers).json()["status"] == "rascunho"
    assert client.post(f"{ADMIN}/{observacao_id}/publicar", headers=admin_headers).status_code == 200


# Referências: anual, acumulada, intervalo e meses citados


def test_ano_nao_inclui_o_acumulado(client, publicar, observacoes):
    anual, acumulado = pi_srs(observacoes), pi_srs(observacoes, "acumulada", 2000)
    publicar(anual["id"], acumulado["id"])

    filtro = {"indicador": PI_DEPOSITOS, "territorio": SRS}
    assert consultar(client, **filtro, ano=2024) == {anual["id"]}
    assert [i["valor"] for i in itens(client.get(PUBLICA, params={**filtro, "ano": 2024}))] == ["5"]


def test_intervalo_de_anos_contem_as_referencias(client, publicar, observacoes):
    anuais = [pi_srs(observacoes, "anual", ano) for ano in range(2020, 2025)]
    acumulados = [pi_srs(observacoes, "acumulada", inicio) for inicio in (2000, 2020)]
    publicar(*(r["id"] for r in anuais + acumulados))
    filtro = {"indicador": PI_DEPOSITOS, "territorio": SRS}

    serie = itens(client.get(PUBLICA, params={**filtro, "referencia_tipo": "anual", "ano_inicio": 2020, "ano_fim": 2024}))
    assert [i["referencia"]["ano_inicio"] for i in serie] == [2020, 2021, 2022, 2023, 2024]
    assert consultar(client, **filtro, referencia_tipo="anual", ano_inicio=2022) == {
        r["id"] for r in anuais if r["referencia"]["ano_inicio"] >= 2022
    }

    contidos = itens(client.get(PUBLICA, params={**filtro, "referencia_tipo": "acumulada", "ano_inicio": 2000, "ano_fim": 2024}))
    assert {(i["valor"], i["referencia"]["rotulo"]) for i in contidos} == {
        ("72", "2000–2024 (acumulado)"), ("24", "2020–2024 (acumulado)"),
    }
    # O acumulado 2000–2024 não cabe no intervalo 2020–2024.
    assert consultar(client, **filtro, referencia_tipo="acumulada", ano_inicio=2020, ano_fim=2024) == {acumulados[1]["id"]}


def test_janeiro_citado_nao_e_mensal(client, publicar, observacoes):
    citado = primeira(observacoes, categoria_codigo=JANEIRO)
    publicar(citado["id"])
    assert consultar(client, referencia_tipo="mensal", ano=2024, mes=1) == set()
    (item,) = itens(client.get(PUBLICA, params={"categoria": JANEIRO}))
    assert item["referencia"]["tipo"] == "anual" and item["referencia"]["mes"] is None
    assert item["categoria"]["classificacao"] == "mes_citado_em_questionario"


def test_rotulos_de_referencia(client, publicar, observacoes):
    exemplos = {
        tipo: primeira(observacoes, ref_tipo=tipo) for tipo in ("anual", "acumulada", "levantamento", "retrato")
    }
    publicar(*(registro["id"] for registro in exemplos.values()))
    rotulos = {i["tipo"]: i["rotulo"] for i in client.get(f"{PUBLICA}/referencias").json()}
    assert rotulos["levantamento"] == "2022 e 2023"
    assert rotulos["retrato"] == "2026 (extração 04/10/2026)"
    assert rotulos["acumulada"].endswith("(acumulado)")


# Valores: exatos, zero e ausência


def test_valor_exato_e_valor_de_exibicao(client, publicar, observacoes):
    longo = next(r for r in observacoes.values() if r["valor"] == "0.0328478422252442")
    publicar(longo["id"])
    item = client.get(f"{PUBLICA}/{longo['id']}").json()
    assert item["valor"] == "0.0328478422252442"
    assert item["valor_exibicao"] == "0.03"


def test_zero_e_diferente_de_sem_dados(client, publicar, observacoes):
    zero = next(r for r in observacoes.values() if r["valor"] == "0" and r["territorio_codigo"] == SRS)
    publicar(zero["id"])
    (item,) = itens(client.get(PUBLICA, params={"indicador": zero["indicador_codigo"], "territorio": SRS}))
    assert item["valor"] == "0"
    # Sem lançamento para a combinação: lista vazia, nunca um zero.
    assert consultar(client, indicador=zero["indicador_codigo"], territorio=SRS, ano=1901) == set()


# Paginação


def test_paginacao(client, publicar, observacoes):
    anuais = [pi_srs(observacoes, "anual", ano) for ano in range(2020, 2025)]
    publicar(*(r["id"] for r in anuais))
    filtro = {"indicador": PI_DEPOSITOS, "territorio": SRS}

    primeira_pagina = client.get(PUBLICA, params={**filtro, "limite": 2}).json()
    assert len(primeira_pagina["itens"]) == 2 and primeira_pagina["total"] == 5
    assert primeira_pagina["limite"] == 2 and primeira_pagina["deslocamento"] == 0
    paginas = [
        item["id"]
        for deslocamento in (0, 2, 4)
        for item in itens(client.get(PUBLICA, params={**filtro, "limite": 2, "deslocamento": deslocamento}))
    ]
    assert sorted(paginas) == sorted(r["id"] for r in anuais)


@pytest.mark.parametrize("params", [{"limite": 0}, {"limite": 1001}, {"deslocamento": -1}])
def test_paginacao_tem_limites(client, carregado, params):
    assert client.get(PUBLICA, params=params).status_code == 422


# Filtros e catálogos


def test_filtros_combinados(client, publicar, observacoes):
    alvo = pi_srs(observacoes)
    outro = next(
        r for r in observacoes.values()
        if r["indicador_codigo"] == PI_DEPOSITOS and r["territorio_codigo"] != SRS
        and r["referencia"]["tipo"] == "anual" and r["referencia"]["ano_inicio"] == 2024
    )
    publicar(alvo["id"], outro["id"])

    assert consultar(client, indicador=PI_DEPOSITOS, ano=2024) == {alvo["id"], outro["id"]}
    assert consultar(client, indicador=PI_DEPOSITOS, ano=2024, territorio=SRS) == {alvo["id"]}
    assert consultar(client, tema=alvo["temas"][0], territorio=SRS) == {alvo["id"]}
    assert consultar(client, territorio=[SRS, outro["territorio_codigo"]]) == {alvo["id"], outro["id"]}


def test_filtro_por_classificacao_e_categoria(client, publicar, observacoes, pacote):
    catalogos = pacote[1]
    com_categoria = next(r for r in observacoes.values() if r["categoria_codigo"])
    classificacao = catalogos["categorias"][com_categoria["categoria_codigo"]]["classificacao"]
    publicar(com_categoria["id"])
    assert consultar(client, classificacao=classificacao) == {com_categoria["id"]}
    assert consultar(client, categoria=com_categoria["categoria_codigo"]) == {com_categoria["id"]}
    outra = next(c for c, item in catalogos["categorias"].items() if item["classificacao"] != classificacao)
    assert consultar(client, classificacao=classificacao, categoria=outra) == set()


def test_cnae_e_categoria_sao_parametros_distintos(client, publicar, observacoes):
    com_categoria = next(r for r in observacoes.values() if r["categoria_codigo"])
    publicar(com_categoria["id"])
    assert consultar(client, codigo_cnae="5510-8/01") == set()
    assert client.get(PUBLICA, params={"codigo_cnae": com_categoria["categoria_codigo"]}).status_code == 422


def test_cnae_do_recorte_vem_da_categoria(client, db, admin_headers, carregado, pacote, novo):
    db.execute(
        text("INSERT INTO catalogos_m6 (tipo, codigo, conteudo) VALUES ('categorias', 'c_hoteis_cnae', CAST(:c AS jsonb))"),
        {"c": json.dumps({"codigo": "c_hoteis_cnae", "nome": "Hotéis", "classificacao": "cnae", "codigo_cnae": "5510-8/01"})},
    )
    criado = client.post(ADMIN, json={**novo, "categoria_codigo": "c_hoteis_cnae"}, headers=admin_headers).json()
    client.post(f"{ADMIN}/{criado['id']}/publicar", headers=admin_headers)

    (item,) = itens(client.get(PUBLICA, params={"codigo_cnae": "5510-8/01"}))
    assert item["id"] == criado["id"]
    assert item["codigo_cnae"] == "5510-8/01" and item["categoria"]["codigo"] == "c_hoteis_cnae"


@pytest.mark.parametrize(
    ("params", "mensagem"),
    [
        ({"territorio": "t_inexistente"}, "Código desconhecido em territorio: t_inexistente."),
        ({"indicador": "i_inexistente"}, "Código desconhecido em indicador: i_inexistente."),
        ({"tema": "tema_inexistente"}, "Código desconhecido em tema: tema_inexistente."),
        ({"categoria": "c_inexistente"}, "Código desconhecido em categoria: c_inexistente."),
        ({"classificacao": "inexistente"}, "Classificação desconhecida: inexistente."),
        ({"mes": 1}, "O filtro de mês exige o ano."),
        ({"ano": 2024, "mes": 1, "referencia_tipo": "anual"}, "O filtro de mês só se aplica a referências mensais."),
        ({"ano_inicio": 2024, "ano_fim": 2020}, "O ano de início deve ser anterior ou igual ao ano de fim."),
    ],
)
def test_codigos_e_combinacoes_invalidas_sao_recusados(client, carregado, params, mensagem):
    resposta = client.get(PUBLICA, params=params)
    assert resposta.status_code == 422
    assert resposta.json() == {"detail": mensagem}


@pytest.mark.parametrize("params", [{"referencia_tipo": "desconhecida"}, {"codigo_cnae": "5510801"}, {"ano": 1800}])
def test_parametros_com_formato_invalido(client, carregado, params):
    assert client.get(PUBLICA, params=params).status_code == 422


def test_catalogo_novo_aparece_sem_alterar_codigo(client, db, admin_headers, carregado, novo):
    db.execute(
        text(
            "INSERT INTO catalogos_m6 (tipo, codigo, conteudo) VALUES ('territorios', 't_nova', "
            "'{\"codigo\": \"t_nova\", \"nome\": \"Nova cidade\", \"tipo\": \"municipio\", \"uf\": \"MG\"}')"
        )
    )
    completo = {i["codigo"]: i for i in client.get(f"{ADMIN}/catalogos", headers=admin_headers).json()["territorios"]}
    # Metadados novos do catálogo são preservados na resposta.
    assert completo["t_nova"] == {
        "codigo": "t_nova", "nome": "Nova cidade", "tipo": "municipio", "uf": "MG",
        "com_dados_publicados": False,
    }
    assert "t_nova" not in {i["codigo"] for i in client.get(f"{PUBLICA}/catalogos").json()["territorios"]}

    criado = client.post(ADMIN, json={**novo, "territorio_codigo": "t_nova"}, headers=admin_headers).json()
    client.post(f"{ADMIN}/{criado['id']}/publicar", headers=admin_headers)
    publicos = {i["codigo"]: i for i in client.get(f"{PUBLICA}/catalogos").json()["territorios"]}
    assert publicos["t_nova"]["uf"] == "MG"


# Cadastro e correção administrativos


@pytest.fixture
def novo(pacote):
    """Corpo válido baseado em uma observação do pacote, com ano livre para não colidir."""
    base = pacote[2][0]
    return {
        "indicador_codigo": base["indicador_codigo"],
        "territorio_codigo": base["territorio_codigo"],
        "categoria_codigo": base["categoria_codigo"],
        "referencia": {"tipo": "anual", "ano_inicio": 2099, "ano_fim": 2099},
        "valor": "3",
        "unidade_codigo": base["unidade_codigo"],
        "qualificador": "igual",
        "fonte_codigo": base["fonte_codigo"],
        "temas": base["temas"],
        "notas": ["Cadastro de teste"],
    }


def test_cadastro_entra_como_rascunho_com_identidade_do_contrato(client, admin_headers, admin, carregado, novo):
    resposta = client.post(ADMIN, json=novo, headers=admin_headers)
    assert resposta.status_code == 201, resposta.text
    corpo = resposta.json()
    assert corpo["status"] == "rascunho"
    assert corpo["referencia"]["mes"] is None
    assert corpo["proveniencias"][0]["origem"] == "cadastro_administrativo"
    assert corpo["proveniencias"][0]["usuario_id"] == admin
    assert [(e["evento"], e["usuario_id"]) for e in corpo["historico"]] == [("cadastro", admin)]
    esperado = identidade({**novo, "referencia": {**novo["referencia"], "mes": None}})
    assert corpo["id"] == esperado
    assert client.get(f"{PUBLICA}/{corpo['id']}").status_code == 404


def test_cadastro_duplicado_retorna_conflito(client, admin_headers, carregado, novo, pacote):
    assert client.post(ADMIN, json=novo, headers=admin_headers).status_code == 201
    repetido = client.post(ADMIN, json={**novo, "valor": "4"}, headers=admin_headers)
    assert repetido.status_code == 409
    assert "Corrija a observação existente" in repetido.json()["detail"]
    base = pacote[2][0]
    do_pacote = {
        **novo,
        "referencia": {k: v for k, v in base["referencia"].items() if v is not None},
        "categoria_codigo": base["categoria_codigo"],
    }
    assert client.post(ADMIN, json=do_pacote, headers=admin_headers).status_code == 409


def test_cadastro_preserva_precisao(client, admin_headers, carregado, novo, pacote):
    razao = next(c for c, u in pacote[1]["unidades"].items() if u["nome"] == "concessões por mil hab.")
    corpo = client.post(
        ADMIN, json={**novo, "unidade_codigo": razao, "valor": "0.0328478422252442"}, headers=admin_headers
    ).json()
    assert corpo["valor"] == "0.0328478422252442"
    assert corpo["valor_exibicao"] == "0.03"


@pytest.mark.parametrize(
    ("unidade", "valor", "mensagem"),
    [
        ("pessoas", "10.5", "exige um valor inteiro"),
        ("índice (0 a 1)", "1.5", "excede o máximo"),
        ("%", "100.01", "excede o máximo"),
    ],
)
def test_cadastro_valida_a_unidade(client, admin_headers, carregado, novo, pacote, unidade, valor, mensagem):
    codigo = next(c for c, u in pacote[1]["unidades"].items() if u["nome"] == unidade)
    resposta = client.post(ADMIN, json={**novo, "unidade_codigo": codigo, "valor": valor}, headers=admin_headers)
    assert resposta.status_code == 422
    assert mensagem in resposta.json()["detail"]


@pytest.mark.parametrize(
    "alteracao",
    [
        {"territorio_codigo": "t_inexistente"},
        {"fonte_codigo": "f_inexistente"},
        {"unidade_codigo": "u_inexistente"},
        {"temas": ["tema_inexistente"]},
        {"temas": []},
        {"valor": "-1"},
        {"valor": "1e3"},
        {"valor": ""},
        {"qualificador": "menor_que"},
        # O CNAE de um recorte pertence à categoria; o campo solto é recusado.
        {"codigo_cnae": "5510-8/01"},
        {"campo_desconhecido": "x"},
        {"referencia": {"tipo": "mensal", "ano_inicio": 2099, "ano_fim": 2099}},
        {"referencia": {"tipo": "anual", "ano_inicio": 2099, "ano_fim": 2099, "mes": 1}},
        {"referencia": {"tipo": "anual", "ano_inicio": 2098, "ano_fim": 2099}},
        {"referencia": {"tipo": "retrato", "ano_inicio": 2099, "ano_fim": 2099}},
        {"referencia": {"tipo": "desconhecido", "ano_inicio": 2099, "ano_fim": 2099}},
    ],
)
def test_cadastro_invalido_e_recusado(client, admin_headers, carregado, novo, alteracao):
    resposta = client.post(ADMIN, json={**novo, **alteracao}, headers=admin_headers)
    assert resposta.status_code == 422, resposta.text


def test_codigo_desconhecido_no_cadastro_tem_mensagem(client, admin_headers, carregado, novo):
    resposta = client.post(ADMIN, json={**novo, "territorio_codigo": "t_inexistente"}, headers=admin_headers)
    assert resposta.json() == {"detail": "Código desconhecido em territorio_codigo: t_inexistente."}


def test_sem_fonte_e_recusado(client, admin_headers, carregado, novo):
    sem_fonte = {k: v for k, v in novo.items() if k != "fonte_codigo"}
    assert client.post(ADMIN, json=sem_fonte, headers=admin_headers).status_code == 422


def test_correcao_de_publicada_preserva_quem_publicou(client, admin_headers, admin, outro_admin, publicar, observacoes):
    registro = pi_srs(observacoes)
    publicar(registro["id"])
    antes = client.get(f"{ADMIN}/{registro['id']}", headers=admin_headers).json()

    corretora, headers_corretora = outro_admin
    resposta = client.patch(f"{ADMIN}/{registro['id']}", json={"valor": "6"}, headers=headers_corretora)
    assert resposta.status_code == 200, resposta.text
    corpo = resposta.json()
    assert corpo["id"] == registro["id"] and corpo["status"] == "publicado"
    assert (corpo["publicado_por"], corpo["publicado_em"]) == (admin, antes["publicado_em"])
    # A proveniência continua a do pacote; a correção vai para o histórico.
    assert corpo["proveniencias"] == registro["proveniencias"]
    correcao = corpo["historico"][-1]
    assert (correcao["evento"], correcao["usuario_id"]) == ("correcao", corretora)
    assert correcao["detalhes"] == {"anterior": {"valor": "5"}, "novo": {"valor": "6"}, "estava_publicada": True}
    assert client.get(f"{PUBLICA}/{registro['id']}").json()["valor"] == "6"


def test_correcao_mantem_o_conteudo_comparavel_ao_pacote(db, client, admin_headers, publicar, observacoes):
    """Publicar e bloquear não alteram `conteudo`: a carga repetida não vira conflito."""
    registro = pi_srs(observacoes)
    publicar(registro["id"])
    client.post(f"{ADMIN}/{registro['id']}/bloquear", json={"motivo": "Teste"}, headers=admin_headers)
    client.post(f"{ADMIN}/{registro['id']}/desbloquear", headers=admin_headers)
    conteudo = db.execute(
        text("SELECT conteudo FROM observacoes_m6 WHERE id = :id"), {"id": registro["id"]}
    ).scalar_one()
    assert conteudo == registro


@pytest.mark.parametrize(
    "corpo", [{}, {"valor": None}, {"valor": "0.5"}, {"qualificador": "x"}, {"codigo_cnae": "5510-8/01"}]
)
def test_correcao_invalida(client, admin_headers, carregado, pacote, corpo):
    patentes = pacote[2][0]["id"]
    assert client.patch(f"{ADMIN}/{patentes}", json=corpo, headers=admin_headers).status_code == 422


def test_despublicar_registra_quem_tinha_publicado(client, admin_headers, admin, publicar, observacoes):
    registro = primeira(observacoes, territorio_codigo=SRS)
    publicar(registro["id"])
    corpo = client.post(f"{ADMIN}/{registro['id']}/despublicar", headers=admin_headers).json()
    assert corpo["status"] == "rascunho" and corpo["publicado_por"] is None
    assert client.get(f"{PUBLICA}/{registro['id']}").status_code == 404
    evento = corpo["historico"][-1]
    assert evento["evento"] == "despublicacao"
    assert evento["detalhes"]["estava_publicada"] is True
    assert evento["detalhes"]["publicado_por"] == admin


def test_bloqueio_e_desbloqueio_ficam_no_historico(client, admin_headers, admin, publicar, observacoes):
    registro = primeira(observacoes, territorio_codigo=SRS)
    publicar(registro["id"])
    client.post(f"{ADMIN}/{registro['id']}/bloquear", json={"motivo": "Amostra insuficiente"}, headers=admin_headers)
    corpo = client.post(f"{ADMIN}/{registro['id']}/desbloquear", headers=admin_headers).json()

    # Desbloquear não republica: voltar à consulta exige uma nova publicação.
    assert corpo["status"] == "rascunho" and not corpo["divulgacao_bloqueada"]
    eventos = [(e["evento"], e["detalhes"]) for e in corpo["historico"]]
    assert [evento for evento, _ in eventos] == ["publicacao", "bloqueio", "desbloqueio"]
    bloqueio = eventos[1][1]
    assert bloqueio["motivo"] == "Amostra insuficiente"
    assert bloqueio["estava_publicada"] is True and bloqueio["publicado_por"] == admin
    assert eventos[2][1] == {"motivo_anterior": "Amostra insuficiente"}


def test_acoes_repetidas_nao_duplicam_o_historico(client, admin_headers, publicar, observacoes):
    registro = pi_srs(observacoes)
    publicar(registro["id"])
    publicar(registro["id"])
    client.post(f"{ADMIN}/{registro['id']}/desbloquear", headers=admin_headers)
    assert [e["evento"] for e in historico(client, admin_headers, registro["id"])] == ["publicacao"]


def test_listagem_administrativa_filtra_status_e_bloqueio(client, admin_headers, publicar, pacote):
    primeiro, segundo, _ = (registro["id"] for registro in pacote[2][:3])
    publicar(primeiro)
    client.post(f"{ADMIN}/{segundo}/bloquear", json={"motivo": "Amostra insuficiente"}, headers=admin_headers)

    def pagina(**params):
        resposta = client.get(ADMIN, params=params, headers=admin_headers)
        assert resposta.status_code == 200, resposta.text
        return resposta.json()

    assert pagina()["total"] == 1228 and len(pagina()["itens"]) == 200
    assert {i["id"] for i in pagina(status="publicado")["itens"]} == {primeiro}
    assert {i["id"] for i in pagina(divulgacao_bloqueada=True)["itens"]} == {segundo}
    assert pagina(status="rascunho", divulgacao_bloqueada=False)["total"] == 1226


@pytest.mark.parametrize(
    ("metodo", "sufixo", "corpo"),
    [
        ("get", "", None),
        ("patch", "", {"valor": "1"}),
        ("post", "/publicar", None),
        ("post", "/despublicar", None),
        ("post", "/bloquear", {"motivo": "x"}),
        ("post", "/desbloquear", None),
    ],
)
def test_observacao_inexistente_retorna_404(client, admin_headers, carregado, metodo, sufixo, corpo):
    resposta = client.request(metodo, f"{ADMIN}/{'0' * 64}{sufixo}", json=corpo, headers=admin_headers)
    assert resposta.status_code == 404


def test_administracao_exige_admin(client, db, carregado, pacote, novo):
    observacao_id = pacote[2][0]["id"]
    leitor = db.execute(
        text("INSERT INTO usuarios (nome, email, papel) VALUES ('Leitor', 'leitor.m6@c317.local', 'leitor') RETURNING id")
    ).scalar_one()
    for headers, esperado in (({}, 401), (auth(create_access_token(leitor)), 403)):
        assert client.get(ADMIN, headers=headers).status_code == esperado
        assert client.get(f"{ADMIN}/catalogos", headers=headers).status_code == esperado
        assert client.post(ADMIN, json=novo, headers=headers).status_code == esperado
        assert client.post(f"{ADMIN}/{observacao_id}/publicar", headers=headers).status_code == esperado
        assert client.post(f"{ADMIN}/{observacao_id}/bloquear", json={"motivo": "x"}, headers=headers).status_code == esperado
    assert itens(client.get(PUBLICA)) == []
