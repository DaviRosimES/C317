"""V9: consulta pública por Setor e Ano/Período, com a mesma elegibilidade em tudo."""

import pytest
from sqlalchemy import text

CONSULTA = "/api/v1/consulta"
ECONOMIA_CRIATIVA = "tema_economia_criativa_ca3ef6a61b"
TURISMO = "tema_turismo_f09ebc929b"
ACOLHEDORA = "i_cidade_vista_como_acolhedora_fc339b5db8"
PI_DEPOSITOS = "i_depositos_de_patentes_de_invencao_pi_1bc517ff0d"
EMPREENDIMENTOS = "i_empreendimentos_ativos_em_santa_rita_do_sapucai_7f1de9c97e"
MORADORES = "4152c38ca7d8e01a414d268629189bebb381815c979fdb82c1b31a0ddb25735b"


def consultar(client, **params) -> dict:
    resposta = client.get(f"{CONSULTA}/indicadores", params=params)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def codigos(corpo: dict) -> list[str]:
    return [indicador["codigo"] for indicador in corpo["indicadores"]]


# Exemplos de referência da simulação (todos os dados publicados)


@pytest.mark.parametrize(
    ("setor", "periodo", "quantidade"),
    [(ECONOMIA_CRIATIVA, "anual-2025", 4), (TURISMO, "anual-2024", 14), (ECONOMIA_CRIATIVA, "anual-2024", 0)],
)
def test_exemplos_da_simulacao(client, publicados_m7, setor, periodo, quantidade):
    corpo = consultar(client, setor=setor, periodo=periodo)
    assert len(corpo["indicadores"]) == quantidade
    for indicador in corpo["indicadores"]:
        assert setor in {s["codigo"] for s in indicador["setores"]}
        assert {dado["referencia"]["chave"] for dado in indicador["dados"]} == {periodo}


def test_economia_criativa_2025_sao_os_quatro_de_percepcao(client, publicados_m7):
    nomes = {i["nome"] for i in consultar(client, setor=ECONOMIA_CRIATIVA, periodo="anual-2025")["indicadores"]}
    assert nomes == {f"Cidade vista como: {a}" for a in ("Acolhedora", "Criativa", "Inovadora", "Inspiradora")}


def test_turismo_2024_nao_inclui_acolhedora(client, publicados_m7):
    assert ACOLHEDORA not in codigos(consultar(client, setor=TURISMO, periodo="anual-2024"))


def test_combinacao_sem_dados_nao_vira_todos(client, publicados_m7):
    corpo = consultar(client, setor=ECONOMIA_CRIATIVA, periodo="anual-2024")
    assert corpo["indicadores"] == []
    assert corpo["setor"]["nome"] == "Economia criativa"
    assert corpo["periodo"]["rotulo"] == "2024 — anual"


def test_todos_sem_duplicar_indicadores_multissetoriais(client, publicados_m7):
    corpo = consultar(client)
    assert len(corpo["indicadores"]) == 61
    assert len(set(codigos(corpo))) == 61
    assert sum(len(i["dados"]) for i in corpo["indicadores"]) == 303
    assert corpo["setor"] is None and corpo["periodo"] is None


@pytest.mark.parametrize(
    ("periodo", "valor", "rotulo"),
    [
        ("anual-2024", "5", "2024 — anual"),
        ("acumulada-2000-2024", "72", "2000–2024 — acumulado"),
        ("acumulada-2020-2024", "24", "2020–2024 — acumulado"),
    ],
)
def test_ano_periodo_e_referencia_completa(client, publicados_m7, periodo, valor, rotulo):
    indicador = client.get(f"{CONSULTA}/indicadores/{PI_DEPOSITOS}", params={"periodo": periodo}).json()
    [dado] = indicador["dados"]
    assert (dado["valor"], dado["referencia"]["rotulo"]) == (valor, rotulo)


def test_levantamento_nao_vira_dois_anos(client, publicados_m7):
    indicador = client.get(
        f"{CONSULTA}/indicadores/{EMPREENDIMENTOS}", params={"setor": TURISMO, "periodo": "levantamento-2022-2023"}
    ).json()
    total = [dado for dado in indicador["dados"] if dado["categoria"] is None]
    assert [dado["valor"] for dado in total] == ["116"]
    assert total[0]["referencia"]["rotulo"] == "2022 e 2023 — levantamento"
    for ano in ("anual-2022", "anual-2023"):
        assert EMPREENDIMENTOS not in codigos(consultar(client, periodo=ano))


def test_detalhe_traz_definicao_unidade_recortes_e_fonte(client, publicados_m7):
    indicador = client.get(f"{CONSULTA}/indicadores/{ACOLHEDORA}").json()
    assert indicador["unidade"]["nome"] == "% dos entrevistados"
    assert indicador["classificacoes"] == [{"codigo": "publico_pesquisa", "nome": "Público da pesquisa"}]
    moradores = next(d for d in indicador["dados"] if d["id"] == MORADORES)
    assert moradores["valor"] == "44.5"
    assert moradores["categoria"]["nome"] == "Moradores"
    assert moradores["categoria"]["classificacao_nome"] == "Público da pesquisa"
    assert moradores["fonte"]["nome"].startswith("Relatório OT nº 004/2025")
    assert moradores["origens"]


# Opções


def test_opcoes_de_setor_e_periodo(client, publicados_m7):
    todas = client.get(f"{CONSULTA}/opcoes").json()
    assert len(todas["setores"]) == 6
    chaves = [p["chave"] for p in todas["periodos"]]
    assert "anual-2024" in chaves and "acumulada-2000-2024" in chaves
    assert len(chaves) == len(set(chaves))

    criativa = client.get(f"{CONSULTA}/opcoes", params={"setor": ECONOMIA_CRIATIVA}).json()
    assert [p["chave"] for p in criativa["periodos"]] == ["anual-2025", "levantamento-2022-2023"]
    # Setores não dependem do período nem do setor escolhido.
    assert criativa["setores"] == todas["setores"]


def test_opcoes_vazias_sem_dados_publicados(client, dados_m7):
    assert client.get(f"{CONSULTA}/opcoes").json() == {"setores": [], "periodos": []}
    assert consultar(client)["indicadores"] == []


@pytest.mark.parametrize(
    ("params", "mensagem"),
    [
        ({"setor": "tema_inexistente"}, "Setor desconhecido."),
        ({"periodo": "2024"}, "Período desconhecido."),
        ({"periodo": "acumulada-2024-2000"}, "Período desconhecido."),
        ({"periodo": "mensal-2024-13"}, "Período desconhecido."),
    ],
)
def test_filtro_desconhecido_e_recusado(client, publicados_m7, params, mensagem):
    for rota in ("/indicadores", "/opcoes", f"/indicadores/{ACOLHEDORA}"):
        if rota == "/opcoes" and "periodo" in params:
            continue
        resposta = client.get(f"{CONSULTA}{rota}", params=params)
        assert resposta.status_code == 422
        assert resposta.json() == {"detail": mensagem}


# Elegibilidade igual em lista, opções, detalhe, acesso por id e fontes


def visivel(client, dado_id: str, indicador: str) -> dict:
    lista = consultar(client)
    na_lista = any(d["id"] == dado_id for i in lista["indicadores"] for d in i["dados"])
    detalhe = client.get(f"{CONSULTA}/indicadores/{indicador}")
    no_detalhe = detalhe.status_code == 200 and any(d["id"] == dado_id for d in detalhe.json()["dados"])
    direto = client.get(f"{CONSULTA}/dados/{dado_id}").status_code == 200
    return {"lista": na_lista, "detalhe": no_detalhe, "direto": direto}


@pytest.mark.parametrize(
    "alteracao",
    [
        "UPDATE dados_indicadores SET status = 'rascunho' WHERE id = :id",
        "UPDATE dados_indicadores SET arquivado = true WHERE id = :id",
        "UPDATE dados_indicadores SET divulgacao_bloqueada = true, motivo_bloqueio = 'Amostra insuficiente' WHERE id = :id",
    ],
)
def test_dado_nao_elegivel_some_de_tudo(client, db, publicados_m7, alteracao):
    assert visivel(client, MORADORES, ACOLHEDORA) == {"lista": True, "detalhe": True, "direto": True}
    db.execute(text(alteracao), {"id": MORADORES})
    assert visivel(client, MORADORES, ACOLHEDORA) == {"lista": False, "detalhe": False, "direto": False}


def test_indicador_arquivado_oculta_dados_e_opcoes(client, db, publicados_m7):
    db.execute(
        text("UPDATE indicadores_definicoes SET arquivado = true WHERE codigo LIKE 'i_cidade_vista_como_%'")
    )
    assert consultar(client, setor=ECONOMIA_CRIATIVA, periodo="anual-2025")["indicadores"] == []
    assert client.get(f"{CONSULTA}/indicadores/{ACOLHEDORA}").status_code == 404
    assert client.get(f"{CONSULTA}/dados/{MORADORES}").status_code == 404
    periodos = client.get(f"{CONSULTA}/opcoes", params={"setor": ECONOMIA_CRIATIVA}).json()["periodos"]
    assert "anual-2025" not in {p["chave"] for p in periodos}
    # Os estados individuais dos dados não mudam.
    assert db.execute(
        text("SELECT DISTINCT status FROM dados_indicadores WHERE indicador_codigo = :c"), {"c": ACOLHEDORA}
    ).scalars().all() == ["publicado"]


def test_indicador_sem_dados_na_selecao_responde_404(client, publicados_m7):
    resposta = client.get(f"{CONSULTA}/indicadores/{ACOLHEDORA}", params={"periodo": "anual-2024"})
    assert resposta.status_code == 404


def test_fontes_publicas_so_de_dados_elegiveis(client, db, publicados_m7):
    fontes = client.get(f"{CONSULTA}/fontes").json()
    hacktown = next(f for f in fontes if f["nome"].startswith("Relatório OT nº 004/2025"))
    db.execute(text("UPDATE dados_indicadores SET status = 'rascunho' WHERE fonte_codigo = :f"), {"f": hacktown["codigo"]})
    assert hacktown["codigo"] not in {f["codigo"] for f in client.get(f"{CONSULTA}/fontes").json()}


def test_consulta_publica_nao_exige_autenticacao(client, publicados_m7):
    assert "authorization" not in {chave.lower() for chave in client.headers}
    assert client.get(f"{CONSULTA}/indicadores").status_code == 200
