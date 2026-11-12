"""V9: carga incremental do pacote c317.m7.g8.v2 e migração dos estados da M6."""

import json
import shutil
import sys

import pytest
from sqlalchemy import text

from scripts.carregar_m7 import CargaComConflitos, aplicar, main, planejar
from scripts.m7.pacote import PacoteInvalido, ler
from tests.conftest import PACOTE_M7

ACOLHEDORA = "i_cidade_vista_como_acolhedora_fc339b5db8"
MORADORES = "4152c38ca7d8e01a414d268629189bebb381815c979fdb82c1b31a0ddb25735b"


def contar(db, tabela: str, condicao: str = "true") -> int:
    return db.execute(text(f"SELECT count(*) FROM {tabela} WHERE {condicao}")).scalar_one()


# Pacote


def test_pacote_confere_contagens_do_manifesto(pacote_m7):
    assert len(pacote_m7.catalogos["indicadores"]) == 61
    assert len(pacote_m7.dados) == 303
    assert len(pacote_m7.associacoes) == 67
    assert len(pacote_m7.retirados) == 925
    assert pacote_m7.exclusoes == 119
    assert len(pacote_m7.legado_demonstracao) == 8


@pytest.fixture
def copia(tmp_path):
    destino = tmp_path / "m7"
    shutil.copytree(PACOTE_M7, destino)
    return destino


def test_hash_divergente_recusa_o_pacote(copia):
    with (copia / "dados_indicadores.jsonl").open("a", encoding="utf-8") as arquivo:
        arquivo.write("\n")
    with pytest.raises(PacoteInvalido, match="hash divergente: dados_indicadores.jsonl"):
        ler(copia)


def test_contrato_diferente_e_recusado(copia):
    manifesto = json.loads((copia / "manifesto.json").read_text(encoding="utf-8"))
    manifesto["contrato"] = "c317.m6.v1"
    (copia / "manifesto.json").write_text(json.dumps(manifesto), encoding="utf-8")
    with pytest.raises(PacoteInvalido, match="não é c317.m7.g8.v2"):
        ler(copia)


def test_validacao_aponta_dado_incompativel(pacote_m7):
    from scripts.m7.pacote import validar

    dado = next(d for d in pacote_m7.dados if d["id"] == MORADORES)
    original = dict(dado)
    try:
        dado["valor"] = "144.5"  # acima do máximo de 100 da unidade
        dado["referencia"] = {**dado["referencia"], "tipo": "mensal"}
        problemas = validar(pacote_m7)
    finally:
        dado.clear()
        dado.update(original)
    assert any(MORADORES in problema for problema in problemas)


# Simulação e aplicação


def test_simulacao_nao_grava(db, m7_vazio, m6_vazio, pacote_m7):
    resumo = planejar(db, pacote_m7).resumo("simulacao_sem_gravacao")
    assert resumo["indicadores"] == {"inserir": 61, "existentes": 0, "conflitos": 0}
    assert resumo["catalogos"]["setores"]["inserir"] == 6
    assert resumo["dados"] == {
        "inserir": 303, "existentes": 0, "conflitos": 0, "estados_preservados_da_m6": 0, "novos_em_rascunho": 303,
    }
    assert resumo["exclusoes_respeitadas"] == 119
    assert resumo["conflitos"] == []
    assert contar(db, "dados_indicadores") == 0
    assert contar(db, "indicadores_definicoes") == 0


def test_aplicar_e_reexecutar_nao_duplica(db, m7_vazio, m6_vazio, pacote_m7):
    aplicar(db, planejar(db, pacote_m7))
    assert contar(db, "indicadores_definicoes") == 61
    assert contar(db, "indicador_setores") == 67
    assert contar(db, "dados_indicadores") == 303
    assert contar(db, "dados_indicadores", "status = 'rascunho' AND NOT arquivado AND NOT divulgacao_bloqueada") == 303

    segunda = aplicar(db, planejar(db, pacote_m7))
    assert segunda["dados"]["inserir"] == 0 and segunda["dados"]["existentes"] == 303
    assert segunda["indicadores"] == {"inserir": 0, "existentes": 61, "conflitos": 0}
    assert contar(db, "dados_indicadores") == 303


def test_preserva_ids_decimais_fontes_referencias_e_origens(db, dados_m7, pacote_m7):
    dado = next(d for d in pacote_m7.dados if d["id"] == MORADORES)
    linha = db.execute(
        text(
            "SELECT valor::text AS valor, fonte_codigo, categoria_codigo, referencia_tipo, ano_inicio, ano_fim, "
            "origens, notas, qualificador FROM dados_indicadores WHERE id = :id"
        ),
        {"id": MORADORES},
    ).one()
    assert linha.valor == dado["valor"] == "44.5"
    assert (linha.fonte_codigo, linha.categoria_codigo) == (dado["fonte_codigo"], dado["categoria_codigo"])
    assert (linha.referencia_tipo, linha.ano_inicio, linha.ano_fim) == ("anual", 2025, 2025)
    assert linha.origens == dado["origens"] and linha.notas == dado["notas"]
    # Todos os decimais saem do banco exatamente como no pacote.
    banco = dict(db.execute(text("SELECT id, valor::text FROM dados_indicadores")).all())
    assert banco == {d["id"]: d["valor"] for d in pacote_m7.dados}


def test_reexecucao_nao_reinicia_estados(db, dados_m7, pacote_m7):
    db.execute(text("UPDATE dados_indicadores SET status = 'publicado' WHERE id = :id"), {"id": MORADORES})
    db.execute(
        text(
            "UPDATE dados_indicadores SET arquivado = true, divulgacao_bloqueada = true, "
            "motivo_bloqueio = 'Amostra insuficiente' WHERE id <> :id AND indicador_codigo = :ind"
        ),
        {"id": MORADORES, "ind": ACOLHEDORA},
    )
    antes = db.execute(text("SELECT id, status, arquivado, divulgacao_bloqueada FROM dados_indicadores ORDER BY id")).all()
    resumo = aplicar(db, planejar(db, pacote_m7))
    assert resumo["dados"]["existentes"] == 303
    assert db.execute(text("SELECT id, status, arquivado, divulgacao_bloqueada FROM dados_indicadores ORDER BY id")).all() == antes


def test_conteudo_corrigido_gera_conflito_sem_sobrescrever(db, dados_m7, pacote_m7):
    db.execute(text("UPDATE dados_indicadores SET valor = 45 WHERE id = :id"), {"id": MORADORES})
    db.execute(text("UPDATE indicadores_definicoes SET nome = 'Acolhedora (corrigido)' WHERE codigo = :c"), {"c": ACOLHEDORA})
    plano = planejar(db, pacote_m7)
    assert plano.resumo("x")["dados"]["conflitos"] == 1
    assert any(MORADORES in conflito and "valor" in conflito for conflito in plano.conflitos())
    assert any(ACOLHEDORA in conflito and "nome" in conflito for conflito in plano.conflitos())
    with pytest.raises(CargaComConflitos, match="nada foi gravado"):
        aplicar(db, plano)

    # Resolução explícita: o banco prevalece nos itens em conflito.
    aplicar(db, plano, manter_banco=True)
    assert db.execute(text("SELECT valor::text FROM dados_indicadores WHERE id = :id"), {"id": MORADORES}).scalar_one() == "45"


def test_mesma_combinacao_com_outro_id_e_conflito(db, definicoes_m7, m6_vazio, pacote_m7):
    dado = next(d for d in pacote_m7.dados if d["id"] == MORADORES)
    db.execute(
        text(
            """
            INSERT INTO dados_indicadores (id, indicador_codigo, territorio_codigo, categoria_codigo,
                fonte_codigo, referencia_tipo, ano_inicio, ano_fim, valor)
            VALUES (:id, :indicador, :territorio, :categoria, :fonte, 'anual', 2025, 2025, 44.5)
            """
        ),
        {
            "id": "f" * 64, "indicador": ACOLHEDORA, "territorio": dado["territorio_codigo"],
            "categoria": dado["categoria_codigo"], "fonte": dado["fonte_codigo"],
        },
    )
    plano = planejar(db, pacote_m7)
    assert plano.conflitos() == [f"dados/{MORADORES}: a mesma combinação já existe no dado {'f' * 64}"]


# Migração a partir da M6


def test_migracao_preserva_estados_da_m6_e_arquiva_nao_municipais(db, carregado, definicoes_m7, pacote_m7):
    admin = db.execute(
        text(
            "INSERT INTO usuarios (nome, email, papel) "
            "VALUES ('Cristiano Ronaldo', 'cristiano.ronaldo@example.test', 'admin') RETURNING id"
        )
    ).scalar_one()
    db.execute(
        text("UPDATE observacoes_m6 SET status = 'publicado', publicado_por = :a, publicado_em = now() WHERE id = :id"),
        {"a": admin, "id": MORADORES},
    )
    bloqueado = pacote_m7.dados[0]["id"]
    db.execute(
        text("UPDATE observacoes_m6 SET divulgacao_bloqueada = true, motivo_bloqueio = 'Restrição da fonte' WHERE id = :id"),
        {"id": bloqueado},
    )
    retirado = pacote_m7.retirados[0]
    db.execute(
        text("UPDATE observacoes_m6 SET status = 'publicado', publicado_por = :a, publicado_em = now() WHERE id = :id"),
        {"a": admin, "id": retirado},
    )

    resumo = aplicar(db, planejar(db, pacote_m7))
    assert resumo["dados"]["estados_preservados_da_m6"] == 303
    assert resumo["arquivamentos_previstos"]["dados_nao_municipais_m6"] == 925

    estados = {
        linha.id: linha
        for linha in db.execute(text("SELECT id, status, divulgacao_bloqueada, motivo_bloqueio FROM dados_indicadores"))
    }
    assert estados[MORADORES].status == "publicado"
    assert (estados[bloqueado].divulgacao_bloqueada, estados[bloqueado].motivo_bloqueio) == (True, "Restrição da fonte")
    # Os não municipais não entram e ficam arquivados na M6, sem exclusão e com o status preservado.
    assert retirado not in estados
    assert contar(db, "observacoes_m6", "arquivado") == 925
    assert contar(db, "observacoes_m6") == 1228
    assert db.execute(text("SELECT status FROM observacoes_m6 WHERE id = :id"), {"id": retirado}).scalar_one() == "publicado"

    reexecucao = planejar(db, pacote_m7).resumo("x")
    assert reexecucao["arquivamentos_previstos"]["dados_nao_municipais_m6"] == 0
    assert reexecucao["arquivamentos_previstos"]["dados_nao_municipais_m6_ja_arquivados"] == 925


def test_m6_publica_nao_mostra_os_arquivados(client, db, carregado, definicoes_m7, pacote_m7, admin):
    retirado = pacote_m7.retirados[0]
    db.execute(
        text("UPDATE observacoes_m6 SET status = 'publicado', publicado_por = :a, publicado_em = now() WHERE id = :id"),
        {"a": admin, "id": retirado},
    )
    assert client.get(f"/api/v1/observacoes/{retirado}").status_code == 200
    aplicar(db, planejar(db, pacote_m7))
    assert client.get(f"/api/v1/observacoes/{retirado}").status_code == 404


# Legado de demonstração


@pytest.fixture
def legado(db):
    """Os oito tipos de demonstração do fixture, com um lançamento fictício cada."""
    from scripts.seed_demo import load_dataset, seed_demo

    seed_demo(db, load_dataset())
    db.execute(text("UPDATE tipos_indicadores SET arquivado = false"))


def test_demonstracoes_antigas_sao_arquivadas_sem_conversao(client, db, dados_m7, legado, pacote_m7):
    lancamentos = contar(db, "indicadores")
    resumo = aplicar(db, planejar(db, pacote_m7))
    assert resumo["arquivamentos_previstos"]["tipos_demonstracao_legado"] == 8
    assert contar(db, "tipos_indicadores", "arquivado") == 8
    assert contar(db, "indicadores") == lancamentos  # nada excluído
    assert contar(db, "dados_indicadores", "demonstracao") == 0  # nada convertido
    codigos = {tipo["codigo"] for tipo in client.get("/api/v1/tipos-indicadores").json()}
    assert not codigos & set(pacote_m7.legado_demonstracao)


def test_legado_com_dado_real_nao_e_arquivado(db, dados_m7, legado, pacote_m7):
    db.execute(text("UPDATE indicadores SET demonstracao = false WHERE tipo = 'numero_hoteis'"))
    plano = planejar(db, pacote_m7)
    assert "numero_hoteis" not in plano.arquivar_legado
    assert any(conflito.startswith("legado/numero_hoteis") for conflito in plano.conflitos())


# Linha de comando


def test_comando_recusa_pacote_invalido(copia, monkeypatch, capsys):
    (copia / "catalogos.json").write_text("{}", encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["carregar_m7", "--pacote", str(copia)])
    assert main() == 2
    assert "Carga recusada: Pacote inválido" in capsys.readouterr().err
