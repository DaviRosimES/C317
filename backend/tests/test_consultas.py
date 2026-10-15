import pytest
from sqlalchemy import text

TIPOS = ["teste_municipal", "teste_percentual", "teste_cnae"]
CNAE_A, CNAE_B = "9999-9/01", "9999-9/02"
FONTE = "Dados fictícios de teste"


def inserir(db, sql, **params):
    resultado = db.execute(text(sql), params)
    return resultado.scalar_one() if resultado.returns_rows else None


@pytest.fixture
def dados(db):
    """Catálogo e lançamentos fictícios isolados da carga de demonstração."""
    for codigo, unidade, escopo in [
        ("teste_municipal", "quantidade", "municipal"),
        ("teste_percentual", "percentual", "municipal"),
        ("teste_cnae", "quantidade", "cnae"),
        ("teste_estab", "quantidade", "estabelecimento"),
    ]:
        inserir(
            db,
            """
            INSERT INTO tipos_indicadores (codigo, nome, descricao, unidade, escopo)
            VALUES (:codigo, :codigo, 'Tipo fictício de teste', :unidade, :escopo)
            """,
            codigo=codigo, unidade=unidade, escopo=escopo,
        )
    setores = {
        codigo: inserir(
            db,
            "INSERT INTO setores (nome, slug, codigo_cnae) VALUES (:nome, :slug, :codigo) RETURNING id",
            nome=f"CNAE {codigo}", slug=f"teste-{codigo}", codigo=codigo,
        )
        for codigo in (CNAE_A, CNAE_B)
    }
    inserir(db, "INSERT INTO rotas VALUES ('teste_rota', 'Rota de teste', 'Fictícia')")
    inserir(db, "INSERT INTO rotas VALUES ('teste_rota_vazia', 'Rota vazia', 'Fictícia')")
    inserir(
        db,
        "INSERT INTO setores_rotas (setor_id, rota_codigo) VALUES (:setor, 'teste_rota')",
        setor=setores[CNAE_A],
    )
    estabelecimento = inserir(
        db,
        """
        INSERT INTO estabelecimentos (setor_id, nome, tipo, status)
        VALUES (:setor, 'Hotel fictício', 'hotel', 'ativo') RETURNING id
        """,
        setor=setores[CNAE_A],
    )

    periodos = {}

    def lancar(tipo, ano, mes, valor, status="publicado", cnae=None, estab=None):
        chave = (ano, mes)
        if chave not in periodos:
            conflito = "(ano) WHERE mes IS NULL" if mes is None else "(ano, mes)"
            periodos[chave] = inserir(
                db,
                f"""
                INSERT INTO periodos (ano, mes) VALUES (:ano, :mes)
                ON CONFLICT {conflito} DO UPDATE SET ano = EXCLUDED.ano RETURNING id
                """,
                ano=ano, mes=mes,
            )
        return inserir(
            db,
            """
            INSERT INTO indicadores
                (tipo, periodo_id, valor, origem, status, setor_id, estabelecimento_id,
                 demonstracao)
            VALUES (:tipo, :periodo, :valor, :origem, :status, :setor, :estab, true)
            RETURNING id
            """,
            tipo=tipo, periodo=periodos[chave], valor=valor, origem=FONTE, status=status,
            setor=setores.get(cnae), estab=estab,
        )

    return {
        "municipal_jan": lancar("teste_municipal", 2080, 1, 100),
        "municipal_fev_zero": lancar("teste_municipal", 2080, 2, 0),
        "municipal_anual": lancar("teste_municipal", 2080, None, 1200),
        "cnae_a_jan": lancar("teste_cnae", 2080, 1, 40, cnae=CNAE_A),
        "cnae_b_jan": lancar("teste_cnae", 2080, 1, 30, cnae=CNAE_B),
        "cnae_a_fev": lancar("teste_cnae", 2080, 2, 45, cnae=CNAE_A),
        "percentual_2081": lancar("teste_percentual", 2081, 1, "55.5"),
        "rascunho_mar": lancar("teste_municipal", 2080, 3, 999, status="rascunho"),
        "rascunho_cnae": lancar("teste_cnae", 2080, 2, 77, status="rascunho", cnae=CNAE_B),
        "estabelecimento": lancar("teste_estab", 2080, 1, 5, estab=estabelecimento),
    }


def consultar(client, **params):
    """Consulta restrita aos tipos de teste, salvo quando o teste define `tipo`."""
    params.setdefault("tipo", TIPOS)
    resposta = client.get("/api/v1/indicadores", params=params)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def ids(itens):
    return {item["id"] for item in itens}


def test_somente_publicados_sao_retornados(client, dados):
    resultado = ids(consultar(client))
    assert resultado == {
        dados[chave]
        for chave in (
            "municipal_jan", "municipal_fev_zero", "municipal_anual",
            "cnae_a_jan", "cnae_b_jan", "cnae_a_fev", "percentual_2081",
        )
    }


def test_lancamentos_de_estabelecimento_nao_sao_publicos(client, dados):
    assert consultar(client, tipo="teste_estab") == []


def test_rascunho_aparece_apos_publicacao(client, admin_headers, dados):
    assert dados["rascunho_mar"] not in ids(consultar(client))
    resposta = client.post(
        f"/api/v1/admin/indicadores/{dados['rascunho_mar']}/publicar", headers=admin_headers
    )
    assert resposta.status_code == 200
    assert dados["rascunho_mar"] in ids(consultar(client))


def test_resposta_traz_unidade_fonte_rota_e_marca_de_demonstracao(client, dados):
    (item,) = consultar(client, cnae=CNAE_A, ano=2080, mes=1)
    assert item == {
        "id": dados["cnae_a_jan"],
        "tipo": "teste_cnae",
        "nome": "teste_cnae",
        "unidade": "quantidade",
        "escopo": "cnae",
        "valor": "40",
        "ano": 2080,
        "mes": 1,
        "codigo_cnae": CNAE_A,
        "nome_cnae": f"CNAE {CNAE_A}",
        "rotas": ["teste_rota"],
        "fonte": FONTE,
        "demonstracao": True,
    }


def test_filtro_por_tipo(client, dados):
    resultado = consultar(client, tipo="teste_percentual")
    assert ids(resultado) == {dados["percentual_2081"]}
    assert resultado[0]["valor"] == "55.5"


def test_filtro_por_cnae_exclui_totais_municipais(client, dados):
    assert ids(consultar(client, cnae=CNAE_A)) == {dados["cnae_a_jan"], dados["cnae_a_fev"]}
    assert ids(consultar(client, cnae=[CNAE_A, CNAE_B])) == {
        dados["cnae_a_jan"], dados["cnae_b_jan"], dados["cnae_a_fev"],
    }


def test_filtro_por_rota(client, dados):
    assert ids(consultar(client, rota="teste_rota")) == {dados["cnae_a_jan"], dados["cnae_a_fev"]}
    assert consultar(client, rota="teste_rota_vazia") == []


def test_filtro_por_escopo(client, dados):
    municipais = consultar(client, escopo="municipal")
    assert {item["escopo"] for item in municipais} == {"municipal"}
    assert all(item["codigo_cnae"] is None for item in municipais)
    assert {item["escopo"] for item in consultar(client, escopo="cnae")} == {"cnae"}


def test_filtro_por_periodicidade(client, dados):
    assert ids(consultar(client, periodicidade="anual")) == {dados["municipal_anual"]}
    assert all(item["mes"] is not None for item in consultar(client, periodicidade="mensal"))


def test_filtro_por_ano_inclui_referencias_mensais_e_anuais(client, dados):
    resultado = consultar(client, ano=2080, escopo="municipal")
    assert ids(resultado) == {
        dados["municipal_jan"], dados["municipal_fev_zero"], dados["municipal_anual"],
    }


def test_filtros_combinados(client, dados):
    assert ids(consultar(client, cnae=CNAE_A, ano=2080, mes=2)) == {dados["cnae_a_fev"]}
    assert ids(consultar(client, tipo="teste_cnae", ano=2080, mes=1, cnae=CNAE_B)) == {
        dados["cnae_b_jan"]
    }


def test_intervalo_mensal_inclui_os_extremos_e_exclui_anuais(client, dados):
    resultado = consultar(client, inicio="2080-02", fim="2081-01")
    assert ids(resultado) == {
        dados["municipal_fev_zero"], dados["cnae_a_fev"], dados["percentual_2081"],
    }
    assert ids(consultar(client, inicio="2081-01")) == {dados["percentual_2081"]}
    assert dados["municipal_anual"] not in ids(consultar(client, fim="2080-12"))


def test_serie_ordenada_cronologicamente(client, dados):
    serie = consultar(client, tipo="teste_cnae", cnae=CNAE_A)
    assert [(item["ano"], item["mes"]) for item in serie] == [(2080, 1), (2080, 2)]


def test_zero_e_diferente_de_ausencia_de_dados(client, dados):
    (zero,) = consultar(client, tipo="teste_municipal", ano=2080, mes=2)
    assert zero["valor"] == "0"
    # Março só tem rascunho: a ausência é uma lista vazia, não um valor zero.
    assert consultar(client, tipo="teste_municipal", ano=2080, mes=3) == []


def test_totais_municipais_nao_sao_somados_aos_valores_por_setor(client, dados):
    resultado = consultar(client, ano=2080, mes=1)
    valores = {(item["tipo"], item["codigo_cnae"]): item["valor"] for item in resultado}
    assert valores == {
        ("teste_municipal", None): "100",
        ("teste_cnae", CNAE_A): "40",
        ("teste_cnae", CNAE_B): "30",
    }


def test_combinacao_sem_resultados_retorna_lista_vazia(client, dados):
    assert consultar(client, cnae=CNAE_B, ano=2080, mes=2) == []
    assert consultar(client, cnae="0000-0/00") == []
    assert consultar(client, tipo="inexistente") == []


@pytest.mark.parametrize(
    "params",
    [
        {"mes": 1},
        {"ano": 2080, "mes": 1, "periodicidade": "anual"},
        {"inicio": "2080-03", "fim": "2080-01"},
        {"inicio": "2080-13"},
        {"fim": "2080-1"},
        {"escopo": "estabelecimento"},
        {"periodicidade": "semanal"},
    ],
)
def test_filtros_invalidos_sao_rejeitados(client, dados, params):
    assert client.get("/api/v1/indicadores", params=params).status_code == 422


def test_catalogo_de_cnaes_inclui_novos_cadastros(client, db, dados):
    cnaes = {item["codigo"]: item for item in client.get("/api/v1/cnaes").json()}
    assert cnaes[CNAE_A]["rotas"] == ["teste_rota"]
    assert cnaes[CNAE_B]["rotas"] == []
    assert "9999-9/03" not in cnaes

    inserir(
        db,
        "INSERT INTO setores (nome, slug, codigo_cnae) VALUES ('Quarto CNAE', 'teste-4', '9999-9/03')",
    )
    novos = {item["codigo"]: item for item in client.get("/api/v1/cnaes").json()}
    assert novos["9999-9/03"]["nome"] == "Quarto CNAE"


def test_catalogo_de_tipos(client, dados):
    tipos = {item["codigo"]: item for item in client.get("/api/v1/tipos-indicadores").json()}
    assert tipos["teste_percentual"]["unidade"] == "percentual"
    assert tipos["teste_cnae"]["escopo"] == "cnae"


def test_rotas_indicam_composicao_pendente(client, dados):
    rotas = {item["codigo"]: item for item in client.get("/api/v1/rotas").json()}
    assert rotas["teste_rota"]["cnaes"] == [CNAE_A]
    assert rotas["teste_rota"]["composicao_pendente"] is False
    assert rotas["teste_rota_vazia"]["cnaes"] == []
    assert rotas["teste_rota_vazia"]["composicao_pendente"] is True


def test_periodos_listam_somente_referencias_publicadas(client, dados):
    periodos = [
        (item["ano"], item["mes"])
        for item in client.get("/api/v1/periodos").json()
        if item["ano"] in (2080, 2081)
    ]
    # Março/2080 só tem rascunho; estabelecimento não é público.
    assert periodos == [(2081, 1), (2080, None), (2080, 2), (2080, 1)]


@pytest.mark.parametrize(
    "rota", ["/api/v1/indicadores", "/api/v1/cnaes", "/api/v1/tipos-indicadores",
             "/api/v1/rotas", "/api/v1/periodos"],
)
def test_consultas_sao_publicas(client, dados, rota):
    assert client.get(rota).status_code == 200
