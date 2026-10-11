from copy import deepcopy
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

from app.core.database import get_database_url
from scripts.seed_demo import load_dataset, seed_demo


@pytest.fixture
def db():
    engine = create_engine(get_database_url())
    with engine.connect() as connection:
        transaction = connection.begin()
        try:
            yield connection
        finally:
            transaction.rollback()
    engine.dispose()


def tipo(db, codigo="tipo_teste", escopo="municipal"):
    db.execute(
        text(
            """
            INSERT INTO tipos_indicadores (codigo, nome, descricao, unidade, escopo)
            VALUES (:codigo, 'Contagem de teste', 'Dado fictício', 'quantidade', :escopo)
            """
        ),
        {"codigo": codigo, "escopo": escopo},
    )
    return codigo


def periodo(db, mes=1):
    return db.execute(
        text("INSERT INTO periodos (ano, mes) VALUES (2080, :mes) RETURNING id"),
        {"mes": mes},
    ).scalar_one()


def setor(db, codigo="9999-9/01"):
    return db.execute(
        text(
            """
            INSERT INTO setores (nome, slug, codigo_cnae)
            VALUES ('Categoria fictícia de teste', :slug, :codigo) RETURNING id
            """
        ),
        {"slug": "teste-" + codigo, "codigo": codigo},
    ).scalar_one()


def lancamento(db, tipo_codigo, periodo_id, **campos):
    parametros = {
        "tipo": tipo_codigo,
        "periodo": periodo_id,
        "valor": 10,
        "origem": "Dados fictícios de teste",
        "setor": None,
        "estabelecimento": None,
        **campos,
    }
    return db.execute(
        text(
            """
            INSERT INTO indicadores
                (tipo, periodo_id, valor, origem, status, setor_id,
                 estabelecimento_id, demonstracao)
            VALUES (:tipo, :periodo, :valor, :origem, 'publicado', :setor,
                    :estabelecimento, true)
            RETURNING id
            """
        ),
        parametros,
    ).scalar_one()


def test_indicador_municipal_nao_exige_estabelecimento(db):
    registro = lancamento(db, tipo(db), periodo(db))
    assert db.execute(
        text("SELECT estabelecimento_id, setor_id FROM indicadores WHERE id = :id"),
        {"id": registro},
    ).one() == (None, None)


def test_indicador_por_cnae_armazena_o_setor(db):
    setor_id = setor(db)
    registro = lancamento(db, tipo(db, escopo="cnae"), periodo(db), setor=setor_id)
    assert db.execute(
        text("SELECT setor_id FROM indicadores WHERE id = :id"), {"id": registro}
    ).scalar_one() == setor_id


def test_periodo_anual_usa_mes_nulo_e_nao_pode_ser_duplicado(db):
    periodo(db, mes=None)
    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        periodo(db, mes=None)
    assert erro.value.orig.diag.constraint_name == "uq_periodos_ano_anual"


def test_cnae_duplicado_e_rejeitado(db):
    setor(db)
    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        db.execute(
            text(
                """
                INSERT INTO setores (nome, slug, codigo_cnae)
                VALUES ('Outro nome', 'outro-slug', '9999-9/01')
                """
            )
        )
    assert erro.value.orig.diag.constraint_name == "uq_setores_codigo_cnae"


def test_cnae_com_formato_invalido_e_rejeitado(db):
    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        setor(db, codigo="5510801")
    assert erro.value.orig.diag.constraint_name == "ck_setores_codigo_cnae"


def test_periodo_anual_e_mensal_do_mesmo_ano_podem_coexistir(db):
    anual = periodo(db, mes=None)
    mensal = periodo(db, mes=1)
    assert anual != mensal


def test_rejeita_dois_alvos_no_mesmo_lancamento(db):
    setor_id = setor(db)
    estabelecimento = db.execute(
        text(
            """
            INSERT INTO estabelecimentos (setor_id, nome, tipo, status)
            VALUES (:setor, 'Hotel Cristiano Ronaldo', 'hotel', 'ativo') RETURNING id
            """
        ),
        {"setor": setor_id},
    ).scalar_one()
    codigo, referencia = tipo(db), periodo(db)
    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        lancamento(db, codigo, referencia, setor=setor_id, estabelecimento=estabelecimento)
    assert erro.value.orig.diag.constraint_name == "ck_indicadores_alvo"


def test_fonte_vazia_e_rejeitada(db):
    codigo, referencia = tipo(db), periodo(db)
    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        lancamento(db, codigo, referencia, origem="   ")
    assert erro.value.orig.diag.constraint_name == "ck_indicadores_origem"


def test_tipo_inexistente_e_rejeitado(db):
    referencia = periodo(db)
    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        lancamento(db, "tipo_inexistente", referencia)
    assert erro.value.orig.diag.constraint_name == "fk_indicadores_tipo"


def test_nao_duplica_o_total_municipal_no_mesmo_periodo(db):
    codigo, referencia = tipo(db), periodo(db)
    lancamento(db, codigo, referencia)
    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        lancamento(db, codigo, referencia)
    assert erro.value.orig.diag.constraint_name == "uq_indicadores_municipais"


def test_nao_duplica_o_recorte_cnae_mas_admite_outro_setor(db):
    primeiro, segundo = setor(db), setor(db, codigo="9999-9/02")
    codigo, referencia = tipo(db, escopo="cnae"), periodo(db)
    lancamento(db, codigo, referencia, setor=primeiro)
    lancamento(db, codigo, referencia, setor=segundo)
    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        lancamento(db, codigo, referencia, setor=primeiro)
    assert erro.value.orig.diag.constraint_name == "uq_indicadores_cnae"


def test_rotas_configuraveis_admitem_associacao_multipla_e_provisoria(db):
    setor_id = setor(db)
    for codigo in ["rota_teste_a", "rota_teste_b"]:
        db.execute(
            text(
                "INSERT INTO rotas (codigo, nome, descricao) "
                "VALUES (:codigo, :codigo, 'Rota fictícia de teste')"
            ),
            {"codigo": codigo},
        )
        db.execute(
            text(
                "INSERT INTO setores_rotas (setor_id, rota_codigo) "
                "VALUES (:setor, :rota)"
            ),
            {"setor": setor_id, "rota": codigo},
        )
    assert db.execute(
        text("SELECT count(*) FROM setores_rotas WHERE setor_id = :id AND provisorio"),
        {"id": setor_id},
    ).scalar_one() == 2


def test_seed_reproduzivel_sem_duplicar_registros_e_sem_estabelecimento_ficticio(db):
    dataset = load_dataset()
    assert seed_demo(db, dataset) == 25
    ids_antes = db.execute(
        text("SELECT id FROM indicadores WHERE origem = :fonte ORDER BY id"),
        {"fonte": dataset["fonte"]},
    ).scalars().all()
    assert seed_demo(db, dataset) == 25
    ids_depois = db.execute(
        text("SELECT id FROM indicadores WHERE origem = :fonte ORDER BY id"),
        {"fonte": dataset["fonte"]},
    ).scalars().all()
    assert ids_antes == ids_depois and len(ids_depois) == 25
    assert db.execute(
        text(
            "SELECT count(*) FROM indicadores WHERE origem = :fonte "
            "AND demonstracao AND estabelecimento_id IS NULL"
        ),
        {"fonte": dataset["fonte"]},
    ).scalar_one() == 25


def test_quarto_cnae_entra_no_catalogo_sem_alterar_o_esquema(db):
    seed_demo(db, load_dataset())
    setor(db, codigo="9999-9/99")
    codigos = db.execute(
        text("SELECT codigo_cnae FROM setores WHERE codigo_cnae IS NOT NULL ORDER BY codigo_cnae")
    ).scalars().all()
    assert set(load_dataset()["cnaes"][i]["codigo_cnae"] for i in range(3)) <= set(codigos)
    assert "9999-9/99" in codigos


@pytest.mark.parametrize("valor", [-1, 101, "NaN"])
def test_seed_rejeita_percentual_invalido_antes_de_inserir(db, valor):
    dataset = deepcopy(load_dataset())
    registro = next(
        r for r in dataset["indicadores"] if r["tipo"] == "ocupacao_media_hoteis"
    )
    registro["valor"] = valor
    quantidade_antes = db.execute(text("SELECT count(*) FROM indicadores")).scalar_one()
    with pytest.raises(ValueError):
        seed_demo(db, dataset)
    assert db.execute(text("SELECT count(*) FROM indicadores")).scalar_one() == quantidade_antes


def test_seed_preserva_valor_real_e_reverte_alteracoes_anteriores_ao_conflito(db):
    dataset = load_dataset()
    seed_demo(db, dataset)
    db.execute(
        text(
            """
            UPDATE indicadores SET demonstracao = false, origem = 'Fonte real',
                valor = 999 WHERE tipo = 'numero_hoteis'
                AND periodo_id = (SELECT id FROM periodos WHERE ano = 2026 AND mes = 8)
            """
        )
    )
    primeiro = next(r for r in dataset["indicadores"] if r["tipo"] == "empregos_formais")
    primeiro["valor"] = 2000
    with pytest.raises(ValueError, match="lançamento existente"):
        seed_demo(db, dataset)
    valores = dict(
        db.execute(
            text(
                """
                SELECT tipo, valor FROM indicadores
                WHERE tipo IN ('empregos_formais', 'numero_hoteis')
                  AND periodo_id = (SELECT id FROM periodos WHERE ano = 2026 AND mes = 8)
                """
            )
        ).all()
    )
    assert valores == {"empregos_formais": Decimal(1000), "numero_hoteis": Decimal(999)}
