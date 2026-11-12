"""Dados do indicador (M7): território, dados normalizados e arquivamento do legado.

- `territorios`: catálogo de abrangência; a operação é fixa em Santa Rita do Sapucaí.
- `dados_indicadores`: um dado por linha, ligado às definições e catálogos da V7. A unidade e
  os setores vêm da definição. Identidade: indicador + território + categoria (ou ausência)
  + referência completa + fonte. O `id` é estável e não é recalculado em correções.
  `status`, `arquivado` e `divulgacao_bloqueada` são independentes.
- `observacoes_m6.arquivado` e `tipos_indicadores.arquivado`: a carga do pacote arquiva os dados
  não municipais da M6 e os tipos de demonstração do legado, sem excluir nada.

Os dados entram pela carga `scripts.carregar_m7`, não por esta migração.

Revision ID: e9a4b7c2d816
Revises: d8f1a6c3e905
"""

from alembic import op
import sqlalchemy as sa


revision = "e9a4b7c2d816"
down_revision = "d8f1a6c3e905"
branch_labels = None
depends_on = None

SANTA_RITA = "t_santa_rita_do_sapucai_831ff035c3"


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE territorios (
            codigo TEXT PRIMARY KEY,
            nome TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
            tipo TEXT NOT NULL CHECK (length(btrim(tipo)) > 0)
        )
        """
    )
    op.execute(
        sa.text(
            "INSERT INTO territorios (codigo, nome, tipo) "
            "VALUES (:codigo, 'Santa Rita do Sapucaí', 'municipio')"
        ).bindparams(codigo=SANTA_RITA)
    )

    op.execute(
        """
        CREATE TABLE dados_indicadores (
            id VARCHAR(64) PRIMARY KEY,
            indicador_codigo TEXT NOT NULL REFERENCES indicadores_definicoes (codigo),
            territorio_codigo TEXT NOT NULL REFERENCES territorios (codigo),
            categoria_codigo TEXT REFERENCES categorias (codigo),
            fonte_codigo TEXT NOT NULL REFERENCES fontes (codigo),
            referencia_tipo TEXT NOT NULL,
            ano_inicio INTEGER NOT NULL,
            ano_fim INTEGER NOT NULL,
            mes INTEGER,
            data_extracao DATE,
            -- Sem escala fixa: preserva o decimal recebido, inclusive as casas informadas.
            valor NUMERIC NOT NULL,
            qualificador TEXT NOT NULL DEFAULT 'igual',
            notas TEXT[] NOT NULL DEFAULT '{}',
            -- Proveniência documental (arquivo/aba/célula); não é histórico de alterações.
            origens JSONB NOT NULL DEFAULT '[]'::jsonb,
            status TEXT NOT NULL DEFAULT 'rascunho',
            arquivado BOOLEAN NOT NULL DEFAULT false,
            divulgacao_bloqueada BOOLEAN NOT NULL DEFAULT false,
            motivo_bloqueio TEXT,
            demonstracao BOOLEAN NOT NULL DEFAULT false,

            CONSTRAINT ck_dados_indicadores_id CHECK (id ~ '^[0-9a-f]{64}$'),
            CONSTRAINT ck_dados_indicadores_valor CHECK (valor >= 0),
            CONSTRAINT ck_dados_indicadores_qualificador CHECK (qualificador IN ('igual', 'maior_que')),
            CONSTRAINT ck_dados_indicadores_status CHECK (status IN ('rascunho', 'publicado')),
            CONSTRAINT ck_dados_indicadores_origens CHECK (jsonb_typeof(origens) = 'array'),
            -- Um CHECK que resulta em NULL é aceito; por isso as comparações usam COALESCE.
            CONSTRAINT ck_dados_indicadores_referencia CHECK (
                referencia_tipo IN ('anual', 'mensal', 'acumulada', 'levantamento', 'retrato')
                AND ano_inicio BETWEEN 1900 AND 2100
                AND ano_fim BETWEEN ano_inicio AND 2100
                AND (referencia_tipo = 'mensal') = (mes IS NOT NULL)
                AND COALESCE(mes BETWEEN 1 AND 12, true)
                AND (referencia_tipo NOT IN ('anual', 'mensal', 'retrato') OR ano_inicio = ano_fim)
                AND (referencia_tipo = 'retrato') = (data_extracao IS NOT NULL)
            ),
            CONSTRAINT ck_dados_indicadores_bloqueio CHECK (
                NOT divulgacao_bloqueada OR length(btrim(COALESCE(motivo_bloqueio, ''))) > 0
            )
        )
        """
    )
    # A unidade não integra a identidade: ela é única por definição.
    op.execute(
        """
        CREATE UNIQUE INDEX uq_dados_indicadores_identidade ON dados_indicadores (
            indicador_codigo, territorio_codigo, categoria_codigo, fonte_codigo,
            referencia_tipo, ano_inicio, ano_fim, mes, data_extracao
        ) NULLS NOT DISTINCT
        """
    )
    op.execute(
        """
        CREATE INDEX ix_dados_indicadores_elegiveis
        ON dados_indicadores (indicador_codigo, referencia_tipo, ano_inicio, ano_fim)
        WHERE status = 'publicado' AND NOT arquivado AND NOT divulgacao_bloqueada
        """
    )

    op.add_column(
        "observacoes_m6",
        sa.Column("arquivado", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "tipos_indicadores",
        sa.Column("arquivado", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    connection = op.get_bind()
    em_uso = connection.execute(
        sa.text(
            """
            SELECT EXISTS(SELECT 1 FROM dados_indicadores)
                OR EXISTS(SELECT 1 FROM observacoes_m6 WHERE arquivado)
                OR EXISTS(SELECT 1 FROM tipos_indicadores WHERE arquivado)
            """
        )
    ).scalar_one()
    if em_uso:
        raise RuntimeError(
            "Há dados do indicador ou itens arquivados pela carga. O downgrade os perderia ou "
            "devolveria dados arquivados à consulta. Exporte-os antes de reverter."
        )
    op.drop_column("tipos_indicadores", "arquivado")
    op.drop_column("observacoes_m6", "arquivado")
    op.execute("DROP TABLE dados_indicadores")
    op.execute("DROP TABLE territorios")
