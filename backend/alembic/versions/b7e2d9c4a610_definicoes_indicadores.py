"""Definições de indicadores, Setores do Observatório e catálogos (V7).

Cria o modelo da definição do indicador (docs/m7/01-estrutura-e-dicionario.md):
uma unidade, um ou mais setores, tipos de referência e classificações
permitidos, aceitação de dado sem categoria, nota metodológica e arquivamento.

O antigo Tema é reaproveitado como Setor do Observatório: os temas e as
unidades já cadastrados em catalogos_m6 são copiados preservando os códigos
(inclusive o prefixo histórico `tema_`). Nada é apagado; observacoes_m6 e
catalogos_m6 continuam intactos até a migração dos dados (V9).

Revision ID: b7e2d9c4a610
Revises: f4c9a2d7e1b3
"""

from alembic import op
import sqlalchemy as sa


revision = "b7e2d9c4a610"
down_revision = "f4c9a2d7e1b3"
branch_labels = None
depends_on = None

_NOME = "length(btrim(nome)) > 0"


def upgrade() -> None:
    op.execute(
        f"""
        CREATE TABLE setores_observatorio (
            codigo TEXT PRIMARY KEY CHECK (length(btrim(codigo)) > 0),
            nome TEXT NOT NULL CHECK ({_NOME})
        )
        """
    )
    op.execute("CREATE UNIQUE INDEX uq_setores_observatorio_nome ON setores_observatorio (lower(btrim(nome)))")

    op.execute(
        f"""
        CREATE TABLE unidades (
            codigo TEXT PRIMARY KEY CHECK (length(btrim(codigo)) > 0),
            nome TEXT NOT NULL CHECK ({_NOME}),
            inteira BOOLEAN NOT NULL,
            maximo NUMERIC CHECK (maximo IS NULL OR maximo > 0),
            casas_exibicao INTEGER NOT NULL CHECK (casas_exibicao BETWEEN 0 AND 10)
        )
        """
    )

    op.execute(
        f"""
        CREATE TABLE fontes (
            codigo TEXT PRIMARY KEY CHECK (length(btrim(codigo)) > 0),
            nome TEXT NOT NULL CHECK ({_NOME}),
            links TEXT[] NOT NULL DEFAULT '{{}}'
        )
        """
    )
    op.execute("CREATE UNIQUE INDEX uq_fontes_nome ON fontes (lower(btrim(nome)))")

    op.execute(
        f"""
        CREATE TABLE classificacoes (
            codigo TEXT PRIMARY KEY CHECK (length(btrim(codigo)) > 0),
            nome TEXT NOT NULL CHECK ({_NOME})
        )
        """
    )
    op.execute("CREATE UNIQUE INDEX uq_classificacoes_nome ON classificacoes (lower(btrim(nome)))")

    op.execute(
        f"""
        CREATE TABLE categorias (
            codigo TEXT PRIMARY KEY CHECK (length(btrim(codigo)) > 0),
            nome TEXT NOT NULL CHECK ({_NOME}),
            classificacao_codigo TEXT NOT NULL REFERENCES classificacoes (codigo),
            -- Opcional: só quando a fonte informa o código; nunca inferido do nome.
            codigo_cnae TEXT CHECK (codigo_cnae IS NULL OR codigo_cnae ~ '^[0-9]{{4}}-[0-9]/[0-9]{{2}}$')
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_categorias_nome ON categorias (classificacao_codigo, lower(btrim(nome)))"
    )

    op.execute(
        f"""
        CREATE TABLE indicadores_definicoes (
            codigo TEXT PRIMARY KEY CHECK (length(btrim(codigo)) > 0),
            nome TEXT NOT NULL CHECK ({_NOME}),
            definicao TEXT NOT NULL CHECK (length(btrim(definicao)) > 0),
            -- Uma unidade por definição: outra unidade é outra medida.
            unidade_codigo TEXT NOT NULL REFERENCES unidades (codigo),
            tipos_referencia_permitidos TEXT[] NOT NULL CHECK (
                cardinality(tipos_referencia_permitidos) > 0
                AND tipos_referencia_permitidos
                    <@ ARRAY['anual', 'mensal', 'acumulada', 'levantamento', 'retrato']::text[]
            ),
            aceita_sem_categoria BOOLEAN NOT NULL,
            nota_metodologica TEXT CHECK (nota_metodologica IS NULL OR length(btrim(nota_metodologica)) > 0),
            arquivado BOOLEAN NOT NULL DEFAULT false
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_indicadores_definicoes_nome ON indicadores_definicoes (lower(btrim(nome)))"
    )

    # Setor pertence à definição, não ao dado; um indicador pode estar em vários.
    op.execute(
        """
        CREATE TABLE indicador_setores (
            indicador_codigo TEXT NOT NULL REFERENCES indicadores_definicoes (codigo) ON DELETE CASCADE,
            setor_codigo TEXT NOT NULL REFERENCES setores_observatorio (codigo),
            PRIMARY KEY (indicador_codigo, setor_codigo)
        )
        """
    )
    op.execute("CREATE INDEX ix_indicador_setores_setor ON indicador_setores (setor_codigo)")
    op.execute(
        """
        CREATE TABLE indicador_classificacoes (
            indicador_codigo TEXT NOT NULL REFERENCES indicadores_definicoes (codigo) ON DELETE CASCADE,
            classificacao_codigo TEXT NOT NULL REFERENCES classificacoes (codigo),
            PRIMARY KEY (indicador_codigo, classificacao_codigo)
        )
        """
    )

    # Tema -> Setor do Observatório, com os mesmos códigos. Unidades já existentes também.
    op.execute(
        """
        INSERT INTO setores_observatorio (codigo, nome)
        SELECT codigo, conteudo->>'nome' FROM catalogos_m6 WHERE tipo = 'temas'
        """
    )
    op.execute(
        """
        INSERT INTO unidades (codigo, nome, inteira, maximo, casas_exibicao)
        SELECT codigo, conteudo->>'nome', (conteudo->>'inteira')::boolean,
               (conteudo->>'maximo')::numeric, (conteudo->>'casas_exibicao')::integer
        FROM catalogos_m6 WHERE tipo = 'unidades'
        """
    )


def downgrade() -> None:
    possui_definicoes = op.get_bind().execute(
        sa.text("SELECT EXISTS(SELECT 1 FROM indicadores_definicoes)")
    ).scalar_one()
    if possui_definicoes:
        raise RuntimeError(
            "Há definições de indicadores cadastradas. Exporte-as antes do downgrade."
        )
    for tabela in (
        "indicador_classificacoes",
        "indicador_setores",
        "indicadores_definicoes",
        "categorias",
        "classificacoes",
        "fontes",
        "unidades",
        "setores_observatorio",
    ):
        op.execute(f"DROP TABLE {tabela}")
