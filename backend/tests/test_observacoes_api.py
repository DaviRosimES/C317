"""V6: consulta pública e manutenção administrativa das observações da M6."""

import pytest
from sqlalchemy import text

from app.core.security import create_access_token
from scripts.m6.contrato import identidade
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


def ids_de(resposta):
    assert resposta.status_code == 200, resposta.text
    return {item["id"] for item in resposta.json()}


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


# Somente publicados chegam ao público


def test_rascunhos_nao_aparecem_em_nenhum_endpoint_publico(client, carregado, pacote):
    qualquer = pacote[2][0]["id"]
    assert client.get(PUBLICA).json() == []
    assert client.get(f"{PUBLICA}/{qualquer}").status_code == 404
    assert client.get(f"{PUBLICA}/referencias").json() == []
    catalogos = client.get(f"{PUBLICA}/catalogos").json()
    assert not any(item["com_dados_publicados"] for itens in catalogos.values() for item in itens)


def test_publicada_aparece_com_metadados(client, publicar, observacoes):
    registro = primeira(observacoes, indicador_codigo=PI_DEPOSITOS, territorio_codigo=SRS, ref_tipo="anual", ref_ano_inicio=2024)
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
    assert "status" not in item and "proveniencias" not in item

    catalogos = client.get(f"{PUBLICA}/catalogos").json()
    usados = {i["codigo"] for i in catalogos["territorios"] if i["com_dados_publicados"]}
    assert usados == {SRS}


def test_bloqueada_nao_vaza_por_nenhum_endpoint(client, admin_headers, publicar, observacoes):
    registro = primeira(observacoes, territorio_codigo=SRS)
    publicar(registro["id"])
    bloqueio = client.post(
        f"{ADMIN}/{registro['id']}/bloquear", json={"motivo": "Amostra insuficiente"}, headers=admin_headers
    )
    assert bloqueio.status_code == 200
    assert bloqueio.json()["status"] == "rascunho"

    assert client.get(PUBLICA).json() == []
    assert consultar(client, territorio=SRS) == set()
    assert client.get(f"{PUBLICA}/{registro['id']}").status_code == 404
    assert client.get(f"{PUBLICA}/referencias").json() == []


def test_publicar_bloqueada_e_recusado_com_motivo(client, admin_headers, carregado, pacote):
    observacao_id = pacote[2][0]["id"]
    client.post(f"{ADMIN}/{observacao_id}/bloquear", json={"motivo": "Amostra insuficiente"}, headers=admin_headers)
    resposta = client.post(f"{ADMIN}/{observacao_id}/publicar", headers=admin_headers)
    assert resposta.status_code == 422
    assert "Amostra insuficiente" in resposta.json()["detail"]

    assert client.post(f"{ADMIN}/{observacao_id}/desbloquear", headers=admin_headers).json()["status"] == "rascunho"
    assert client.post(f"{ADMIN}/{observacao_id}/publicar", headers=admin_headers).status_code == 200


# Referências: anual, acumulada e meses citados


def test_ano_nao_inclui_o_acumulado(client, publicar, observacoes):
    anual = primeira(observacoes, indicador_codigo=PI_DEPOSITOS, territorio_codigo=SRS, ref_tipo="anual", ref_ano_inicio=2024)
    acumulado = primeira(observacoes, indicador_codigo=PI_DEPOSITOS, territorio_codigo=SRS, ref_tipo="acumulada", ref_ano_inicio=2000)
    publicar(anual["id"], acumulado["id"])

    filtro = {"indicador": PI_DEPOSITOS, "territorio": SRS}
    assert consultar(client, **filtro, ano=2024) == {anual["id"]}
    em_2024 = client.get(PUBLICA, params={**filtro, "ano": 2024}).json()
    assert [i["valor"] for i in em_2024] == ["5"]

    acumulados = client.get(
        PUBLICA, params={**filtro, "referencia_tipo": "acumulada", "ano_inicio": 2000, "ano_fim": 2024}
    ).json()
    assert [(i["valor"], i["referencia"]["rotulo"]) for i in acumulados] == [("72", "2000–2024 (acumulado)")]


def test_janeiro_citado_nao_e_mensal(client, publicar, observacoes):
    citado = primeira(observacoes, categoria_codigo=JANEIRO)
    publicar(citado["id"])
    assert consultar(client, referencia_tipo="mensal", ano=2024, mes=1) == set()
    (item,) = client.get(PUBLICA, params={"categoria": JANEIRO}).json()
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
    (item,) = client.get(PUBLICA, params={"indicador": zero["indicador_codigo"], "territorio": SRS}).json()
    assert item["valor"] == "0"
    # Sem lançamento para a combinação: lista vazia, nunca um zero.
    assert consultar(client, indicador=zero["indicador_codigo"], territorio=SRS, ano=1901) == set()


# Filtros e catálogos


def test_filtros_combinados(client, publicar, observacoes):
    alvo = primeira(observacoes, indicador_codigo=PI_DEPOSITOS, territorio_codigo=SRS, ref_tipo="anual", ref_ano_inicio=2024)
    outro = primeira(observacoes, indicador_codigo=PI_DEPOSITOS, ref_tipo="anual", ref_ano_inicio=2024)
    if outro["territorio_codigo"] == SRS:
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
    ],
)
def test_codigos_e_combinacoes_invalidas_sao_recusados(client, carregado, params, mensagem):
    resposta = client.get(PUBLICA, params=params)
    assert resposta.status_code == 422
    assert resposta.json() == {"detail": mensagem}


@pytest.mark.parametrize("params", [{"referencia_tipo": "desconhecida"}, {"codigo_cnae": "5510801"}, {"ano": 1800}])
def test_parametros_com_formato_invalido(client, carregado, params):
    assert client.get(PUBLICA, params=params).status_code == 422


def test_catalogo_novo_aparece_sem_alterar_codigo(client, db, carregado):
    db.execute(
        text(
            "INSERT INTO catalogos_m6 (tipo, codigo, conteudo) VALUES ('territorios', 't_nova', "
            "'{\"codigo\": \"t_nova\", \"nome\": \"Nova cidade\", \"tipo\": \"municipio\", \"uf\": \"MG\"}')"
        )
    )
    territorios = {i["codigo"]: i for i in client.get(f"{PUBLICA}/catalogos").json()["territorios"]}
    # Metadados novos do catálogo são preservados na resposta.
    assert territorios["t_nova"] == {
        "codigo": "t_nova", "nome": "Nova cidade", "tipo": "municipio", "uf": "MG",
        "com_dados_publicados": False,
    }
    assert client.get(PUBLICA, params={"territorio": "t_nova"}).json() == []


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
        {"codigo_cnae": "5510801"},
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


def test_sem_fonte_e_recusado(client, admin_headers, carregado, novo):
    sem_fonte = {k: v for k, v in novo.items() if k != "fonte_codigo"}
    assert client.post(ADMIN, json=sem_fonte, headers=admin_headers).status_code == 422


def test_correcao_mantem_identidade_e_registra_historico(client, admin_headers, admin, publicar, observacoes):
    registro = primeira(observacoes, indicador_codigo=PI_DEPOSITOS, territorio_codigo=SRS, ref_tipo="anual", ref_ano_inicio=2024)
    publicar(registro["id"])
    resposta = client.patch(f"{ADMIN}/{registro['id']}", json={"valor": "6"}, headers=admin_headers)
    assert resposta.status_code == 200, resposta.text
    corpo = resposta.json()
    assert corpo["id"] == registro["id"]
    assert corpo["status"] == "publicado" and corpo["publicado_por"] == admin
    assert corpo["proveniencias"][-1]["origem"] == "correcao_administrativa"
    assert corpo["proveniencias"][-1]["anterior"] == {"valor": "5"}
    assert client.get(f"{PUBLICA}/{registro['id']}").json()["valor"] == "6"


@pytest.mark.parametrize("corpo", [{}, {"valor": None}, {"valor": "0.5"}, {"qualificador": "x"}])
def test_correcao_invalida(client, admin_headers, carregado, pacote, corpo):
    patentes = pacote[2][0]["id"]
    assert client.patch(f"{ADMIN}/{patentes}", json=corpo, headers=admin_headers).status_code == 422


def test_despublicar_retira_da_consulta(client, admin_headers, publicar, observacoes):
    registro = primeira(observacoes, territorio_codigo=SRS)
    publicar(registro["id"])
    corpo = client.post(f"{ADMIN}/{registro['id']}/despublicar", headers=admin_headers).json()
    assert corpo["status"] == "rascunho" and corpo["publicado_por"] is None
    assert client.get(f"{PUBLICA}/{registro['id']}").status_code == 404


def test_listagem_administrativa_filtra_status_e_bloqueio(client, admin_headers, publicar, pacote):
    primeiro, segundo, terceiro = (registro["id"] for registro in pacote[2][:3])
    publicar(primeiro)
    client.post(f"{ADMIN}/{segundo}/bloquear", json={"motivo": "Amostra insuficiente"}, headers=admin_headers)

    def ids(**params):
        return ids_de(client.get(ADMIN, params=params, headers=admin_headers))

    assert len(ids()) == 1228
    assert ids(status="publicado") == {primeiro}
    assert ids(divulgacao_bloqueada=True) == {segundo}
    assert terceiro in ids(status="rascunho", divulgacao_bloqueada=False)


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
        assert client.post(ADMIN, json=novo, headers=headers).status_code == esperado
        assert client.post(f"{ADMIN}/{observacao_id}/publicar", headers=headers).status_code == esperado
        assert client.post(f"{ADMIN}/{observacao_id}/bloquear", json={"motivo": "x"}, headers=headers).status_code == esperado
    assert client.get(PUBLICA).json() == []
