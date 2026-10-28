"""V5: modelo das observações da M6 e compatibilidade com o carregador da G4.

Cada teste roda dentro da transação revertida da fixture `db`; o carregador
recebe a conexão psycopg dessa mesma transação.
"""

import json
from copy import deepcopy
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.apresentacao import valor_para_exibicao
from app.core.security import hash_password
from scripts.carregar_m6 import aplicar, validar_banco
from scripts.m6.contrato import identidade

JANEIRO = "c_mes_citado_em_questionario_janeiro_181d6bf102"


@pytest.fixture
def catalogos(db, m6_vazio, pacote):
    """Somente os catálogos: suficiente para inserir variações sem a carga completa."""
    _, catalogos, _ = pacote
    for tipo, itens in catalogos.items():
        for codigo, conteudo in itens.items():
            inserir_catalogo(db, tipo, codigo, conteudo)
    return catalogos


def inserir_catalogo(db, tipo, codigo, conteudo):
    db.execute(
        text(
            "INSERT INTO catalogos_m6 (tipo, codigo, conteudo) "
            "VALUES (:tipo, :codigo, CAST(:conteudo AS jsonb))"
        ),
        {"tipo": tipo, "codigo": codigo, "conteudo": json.dumps(conteudo)},
    )


def unidade(catalogos, nome):
    return next(codigo for codigo, item in catalogos["unidades"].items() if item["nome"] == nome)


def variacao(pacote, **campos):
    """Observação válida do pacote com campos alterados e identidade recalculada."""
    base = deepcopy(pacote[2][0])
    base.update(campos)
    base["id"] = identidade(base)
    return base


def inserir(db, observacao, valor=None, **colunas):
    parametros = {
        "id": observacao.get("id"),
        "valor": Decimal(observacao["valor"]) if valor is None else valor,
        "conteudo": json.dumps(observacao),
        "status": "rascunho",
        "divulgacao_bloqueada": False,
        "motivo_bloqueio": None,
        "publicado_por": None,
        "publicado_em": None,
        **colunas,
    }
    db.execute(
        text(
            """
            INSERT INTO observacoes_m6
                (id, valor, conteudo, status, divulgacao_bloqueada, motivo_bloqueio,
                 publicado_por, publicado_em)
            VALUES (:id, :valor, CAST(:conteudo AS jsonb), :status, :divulgacao_bloqueada,
                    :motivo_bloqueio, :publicado_por, CAST(:publicado_em AS timestamptz))
            """
        ),
        parametros,
    )


def rejeitado(db, operacao, restricao):
    """Executa em savepoint e confirma que o banco recusou pela restrição esperada."""
    with pytest.raises(IntegrityError) as erro:
        with db.begin_nested():
            operacao()
    assert restricao in str(erro.value)


def admin(db):
    return db.execute(
        text(
            """
            INSERT INTO usuarios (nome, email, papel, senha_hash)
            VALUES ('Admin M6', 'admin.m6@c317.local', 'admin', :hash) RETURNING id
            """
        ),
        {"hash": hash_password("senha-m6-teste")},
    ).scalar_one()


# Compatibilidade com o carregador da G4


def test_carregador_reconhece_o_esquema(psycopg):
    validar_banco(psycopg, "postgresql")


def test_carga_completa_entra_como_rascunho_e_e_repetivel(db, psycopg, pacote, carregado):
    manifesto, catalogos, observacoes = pacote
    assert carregado["observacoes_criadas"] == len(observacoes) == 1228
    assert carregado["catalogos_criados"] == sum(len(itens) for itens in catalogos.values())

    repeticao = aplicar(psycopg, "postgresql", manifesto, catalogos, observacoes)
    assert repeticao["observacoes_criadas"] == 0
    assert repeticao["observacoes_reutilizadas"] == 1228
    assert repeticao["carga_ja_registrada"] is True

    estados = db.execute(
        text("SELECT status, demonstracao, count(*) FROM observacoes_m6 GROUP BY 1, 2")
    ).all()
    assert estados == [("rascunho", False, 1228)]


def test_colunas_geradas_refletem_o_contrato(db, pacote, carregado):
    registro = pacote[2][0]
    linha = db.execute(
        text(
            """
            SELECT indicador_codigo, territorio_codigo, categoria_codigo, unidade_codigo,
                   fonte_codigo, qualificador, referencia_tipo, ano_inicio, ano_fim, mes
            FROM observacoes_m6 WHERE id = :id
            """
        ),
        {"id": registro["id"]},
    ).one()
    referencia = registro["referencia"]
    assert tuple(linha) == (
        registro["indicador_codigo"], registro["territorio_codigo"], registro["categoria_codigo"],
        registro["unidade_codigo"], registro["fonte_codigo"], registro["qualificador"],
        referencia["tipo"], referencia["ano_inicio"], referencia["ano_fim"], referencia["mes"],
    )


# Identidade e recortes


def test_mesmo_indicador_tem_varios_municipios_e_categorias(db, carregado):
    indicadores = db.execute(
        text(
            """
            SELECT indicador_codigo FROM observacoes_m6
            GROUP BY indicador_codigo
            HAVING count(DISTINCT territorio_codigo) > 1 AND count(DISTINCT categoria_codigo) > 1
            """
        )
    ).scalars().all()
    assert indicadores


def test_identidade_impede_duas_observacoes_para_o_mesmo_recorte(db, pacote, catalogos):
    original = pacote[2][0]
    inserir(db, original)
    copia = {**deepcopy(original), "id": "f" * 64, "valor": "999"}
    rejeitado(db, lambda: inserir(db, copia), "uq_observacoes_m6_identidade")


def test_recorte_diferente_nao_colide(db, pacote, catalogos):
    original = pacote[2][0]
    inserir(db, original)
    outro_territorio = next(
        codigo for codigo in catalogos["territorios"] if codigo != original["territorio_codigo"]
    )
    inserir(db, variacao(pacote, territorio_codigo=outro_territorio))


# Precisão e unidades


def test_precisao_original_e_preservada(db, pacote, carregado):
    longos = [o for o in pacote[2] if -Decimal(o["valor"]).as_tuple().exponent > 4]
    assert len(longos) == 41
    gravados = dict(
        db.execute(
            text("SELECT id, valor::text FROM observacoes_m6 WHERE id = ANY(:ids)"),
            {"ids": [o["id"] for o in longos]},
        ).all()
    )
    assert gravados == {o["id"]: o["valor"] for o in longos}


@pytest.mark.parametrize(
    ("nome_unidade", "valor"),
    [
        ("índice (0 a 1)", "0.75"),
        ("índice (0 a 1)", "1"),
        ("%", "100"),
        ("nota 0–10", "9.5"),
        ("R$", "1850000.00"),
        ("concessões por mil hab.", "0.0328478422252442"),
        ("pessoas", "0"),
    ],
)
def test_valores_validos_por_unidade(db, pacote, catalogos, nome_unidade, valor):
    observacao = variacao(pacote, unidade_codigo=unidade(catalogos, nome_unidade), valor=valor)
    inserir(db, observacao)
    gravado = db.execute(
        text("SELECT valor::text FROM observacoes_m6 WHERE id = :id"), {"id": observacao["id"]}
    ).scalar_one()
    assert gravado == valor


@pytest.mark.parametrize(
    ("nome_unidade", "valor", "mensagem"),
    [
        ("índice (0 a 1)", "1.5", "acima do máximo"),
        ("%", "100.01", "acima do máximo"),
        ("nota 0–10", "10.5", "acima do máximo"),
        ("pessoas", "10.5", "exige valor inteiro"),
        ("patentes", "0.5", "exige valor inteiro"),
    ],
)
def test_valores_incompativeis_com_a_unidade_sao_recusados(
    db, pacote, catalogos, nome_unidade, valor, mensagem
):
    observacao = variacao(pacote, unidade_codigo=unidade(catalogos, nome_unidade), valor=valor)
    rejeitado(db, lambda: inserir(db, observacao), mensagem)


def test_indice_0_a_1_nao_vira_percentual(db, pacote, catalogos):
    indice = unidade(catalogos, "índice (0 a 1)")
    observacao = variacao(pacote, unidade_codigo=indice, valor="0.75")
    inserir(db, observacao)
    linha = db.execute(
        text("SELECT valor, unidade_codigo FROM observacoes_m6 WHERE id = :id"),
        {"id": observacao["id"]},
    ).one()
    assert linha == (Decimal("0.75"), indice)


def test_valor_negativo_ou_divergente_do_conteudo_e_recusado(db, pacote, catalogos):
    negativo = variacao(pacote, valor="-1")
    rejeitado(db, lambda: inserir(db, negativo), "ck_observacoes_m6_valor")
    observacao = variacao(pacote, valor="10")
    rejeitado(db, lambda: inserir(db, observacao, valor=Decimal("11")), "ck_observacoes_m6_valor")


def test_valor_precisa_trafegar_como_texto(db, pacote, catalogos):
    observacao = variacao(pacote, valor="10")
    observacao["valor"] = 10
    rejeitado(db, lambda: inserir(db, observacao, valor=Decimal("10")), "ck_observacoes_m6_valor")


def test_limite_mais_de_e_preservado(db, pacote, carregado):
    assert db.execute(
        text("SELECT count(*) FROM observacoes_m6 WHERE qualificador = 'maior_que'")
    ).scalar_one() == 3
    desconhecido = variacao(pacote, qualificador="menor_que")
    rejeitado(db, lambda: inserir(db, desconhecido), "ck_observacoes_m6_qualificador")


# Referências


def test_janeiro_citado_nao_e_dado_mensal_de_janeiro_de_2024(db, carregado):
    citados = db.execute(
        text(
            "SELECT referencia_tipo, ano_inicio, ano_fim, mes FROM observacoes_m6 "
            "WHERE categoria_codigo = :janeiro"
        ),
        {"janeiro": JANEIRO},
    ).all()
    assert citados and set(citados) == {("anual", 2024, 2024, None)}
    mensal = db.execute(
        text(
            "SELECT count(*) FROM observacoes_m6 "
            "WHERE referencia_tipo = 'mensal' AND ano_inicio = 2024 AND mes = 1"
        )
    ).scalar_one()
    assert mensal == 0


def test_acumulado_2000_2024_e_distinto_do_anual_2024(db, carregado):
    tipos = dict(
        db.execute(
            text(
                """
                SELECT referencia_tipo, count(*) FROM observacoes_m6
                WHERE ano_fim = 2024 AND (ano_inicio = 2000 OR ano_inicio = 2024)
                GROUP BY referencia_tipo
                """
            )
        ).all()
    )
    assert tipos.get("acumulada", 0) > 0 and tipos.get("anual", 0) > 0
    assert db.execute(
        text(
            "SELECT count(*) FROM observacoes_m6 "
            "WHERE referencia_tipo = 'acumulada' AND ano_inicio = ano_fim"
        )
    ).scalar_one() == 0


@pytest.mark.parametrize(
    "referencia",
    [
        {"tipo": "mensal", "ano_inicio": 2024, "ano_fim": 2024, "mes": None},
        {"tipo": "anual", "ano_inicio": 2024, "ano_fim": 2024, "mes": 1},
        {"tipo": "anual", "ano_inicio": 2023, "ano_fim": 2024, "mes": None},
        {"tipo": "mensal", "ano_inicio": 2024, "ano_fim": 2024, "mes": 13},
        {"tipo": "acumulada", "ano_inicio": 2024, "ano_fim": 2000, "mes": None},
        {"tipo": "retrato", "ano_inicio": 2026, "ano_fim": 2026, "mes": None},
        {"tipo": "desconhecido", "ano_inicio": 2024, "ano_fim": 2024, "mes": None},
    ],
)
def test_referencias_invalidas_ou_nao_confirmadas_sao_recusadas(db, pacote, catalogos, referencia):
    observacao = variacao(pacote, referencia=referencia)
    rejeitado(db, lambda: inserir(db, observacao), "ck_observacoes_m6_referencia")


def test_referencia_mensal_valida(db, pacote, catalogos):
    referencia = {"tipo": "mensal", "ano_inicio": 2024, "ano_fim": 2024, "mes": 1}
    inserir(db, variacao(pacote, referencia=referencia))


# Catálogo


def test_codigo_fora_do_catalogo_e_recusado(db, pacote, catalogos):
    observacao = variacao(pacote, territorio_codigo="t_inexistente")
    rejeitado(db, lambda: inserir(db, observacao), "Código ausente do catálogo territorios")
    sem_tema = variacao(pacote, temas=["tema_inexistente"])
    rejeitado(db, lambda: inserir(db, sem_tema), "Código ausente do catálogo temas")


def test_catalogo_cresce_por_dados(db, pacote, catalogos):
    inserir_catalogo(
        db, "territorios", "t_nova_cidade",
        {"codigo": "t_nova_cidade", "nome": "Nova cidade", "tipo": "municipio"},
    )
    inserir(db, variacao(pacote, territorio_codigo="t_nova_cidade"))


def test_unidade_sem_contrato_de_validacao_e_recusada(db, catalogos):
    rejeitado(
        db,
        lambda: inserir_catalogo(db, "unidades", "u_sem_regra", {"codigo": "u_sem_regra", "nome": "x"}),
        "ck_catalogos_m6_unidade",
    )


def test_item_de_catalogo_em_uso_nao_pode_ser_removido(db, pacote, catalogos):
    observacao = pacote[2][0]
    inserir(db, observacao)
    rejeitado(
        db,
        lambda: db.execute(
            text("DELETE FROM catalogos_m6 WHERE tipo = 'territorios' AND codigo = :codigo"),
            {"codigo": observacao["territorio_codigo"]},
        ),
        "usado por observações",
    )


def test_cnae_e_classificacao_separada_e_opcional(db, pacote, catalogos):
    inserir(db, variacao(pacote, codigo_cnae="5510-8/01"))
    outro_territorio = next(
        codigo for codigo in catalogos["territorios"] if codigo != pacote[2][0]["territorio_codigo"]
    )
    invalido = variacao(pacote, codigo_cnae="5510801", territorio_codigo=outro_territorio)
    rejeitado(db, lambda: inserir(db, invalido), "ck_observacoes_m6_cnae")


# Publicação


def test_publicacao_exige_responsavel_e_data(db, pacote, catalogos):
    observacao = pacote[2][0]
    rejeitado(db, lambda: inserir(db, observacao, status="publicado"), "ck_observacoes_m6_publicacao")
    inserir(db, observacao, status="publicado", publicado_por=admin(db), publicado_em="2026-10-28T12:00:00Z")


def test_divulgacao_bloqueada_impede_publicacao(db, pacote, catalogos):
    observacao = pacote[2][0]
    responsavel = admin(db)
    inserir(db, observacao, divulgacao_bloqueada=True, motivo_bloqueio="Amostra insuficiente")
    rejeitado(
        db,
        lambda: db.execute(
            text(
                """
                UPDATE observacoes_m6
                SET status = 'publicado', publicado_por = :admin, publicado_em = now()
                WHERE id = :id
                """
            ),
            {"admin": responsavel, "id": observacao["id"]},
        ),
        "ck_observacoes_m6_publicacao",
    )


@pytest.mark.parametrize("motivo", [None, " "])
def test_bloqueio_exige_motivo(db, pacote, catalogos, motivo):
    rejeitado(
        db,
        lambda: inserir(db, pacote[2][0], divulgacao_bloqueada=True, motivo_bloqueio=motivo),
        "ck_observacoes_m6_bloqueio",
    )


@pytest.mark.parametrize(
    ("campo", "restricao"),
    [
        ("fonte_codigo", "fonte_codigo"),
        ("indicador_codigo", "indicador_codigo"),
        ("referencia", "referencia_tipo"),
        ("temas", "ck_observacoes_m6_completa"),
        ("proveniencias", "ck_observacoes_m6_completa"),
        ("valor", "ck_observacoes_m6_valor"),
        ("id", "ck_observacoes_m6_id"),
    ],
)
def test_observacao_sem_campo_obrigatorio_e_recusada(db, pacote, catalogos, campo, restricao):
    incompleta = variacao(pacote)
    id_original = incompleta["id"]
    del incompleta[campo]
    valor = Decimal(pacote[2][0]["valor"])
    rejeitado(db, lambda: inserir(db, incompleta, valor=valor, id=id_original), restricao)


def test_observacao_sem_proveniencia_e_recusada(db, pacote, catalogos):
    sem_proveniencia = variacao(pacote, proveniencias=[])
    rejeitado(db, lambda: inserir(db, sem_proveniencia), "ck_observacoes_m6_completa")


@pytest.mark.parametrize(
    "conteudo",
    [
        {"nome": "Sem código"},
        {"codigo": "t_sem_nome"},
        {"codigo": "t_sem_nome", "nome": "  "},
    ],
)
def test_catalogo_incompleto_e_recusado(db, m6_vazio, conteudo):
    rejeitado(
        db,
        lambda: inserir_catalogo(db, "territorios", "t_sem_nome", conteudo),
        "ck_catalogos_m6_",
    )


# Apresentação


@pytest.mark.parametrize(
    ("valor", "casas", "exibido"),
    [
        ("0.0328478422252442", 2, "0.03"),
        ("2.345", 2, "2.35"),
        ("68.125", 2, "68.13"),
        ("1850000", 2, "1850000.00"),
        ("72", 0, "72"),
    ],
)
def test_arredondamento_apenas_para_exibicao(valor, casas, exibido):
    original = Decimal(valor)
    assert str(valor_para_exibicao(original, casas)) == exibido
    assert original == Decimal(valor)
