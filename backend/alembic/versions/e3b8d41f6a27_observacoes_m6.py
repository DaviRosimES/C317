"""Observações da M6: catálogos, observações e histórico de cargas (contrato c317.m6.v1).

Incorpora a proposta de G4 (docs/m6/contrato-importacao.sql) com as colunas que
o carregador scripts.carregar_m6 exige, acrescentando:

- colunas geradas a partir do JSON, para identidade, filtros e restrições;
- identidade única por indicador, território, categoria, unidade, fonte e referência;
- regras de referência (mês só em referência mensal; sem período desconhecido);
- validação de unidade e de catálogo por trigger, para qualquer forma de escrita;
- bloqueio de divulgação e responsável pela publicação.

As tabelas anteriores (indicadores, setores/CNAE etc.) não são alteradas.

Revision ID: e3b8d41f6a27
Revises: c5e1f7a3b902
"""

from alembic import op
import sqlalchemy as sa


revision = "e3b8d41f6a27"
down_revision = "c5e1f7a3b902"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE catalogos_m6 (
            tipo TEXT NOT NULL,
            codigo TEXT NOT NULL,
            conteudo JSONB NOT NULL,
            PRIMARY KEY (tipo, codigo),
            CONSTRAINT ck_catalogos_m6_tipo CHECK (
                tipo IN ('temas', 'indicadores', 'categorias', 'territorios', 'unidades', 'fontes')
            ),
            -- Um CHECK que resulta em NULL é aceito; por isso campos ausentes viram ''.
            CONSTRAINT ck_catalogos_m6_codigo CHECK (conteudo->>'codigo' IS NOT DISTINCT FROM codigo),
            CONSTRAINT ck_catalogos_m6_nome CHECK (length(btrim(COALESCE(conteudo->>'nome', ''))) > 0),
            -- A unidade carrega o próprio contrato de validação e de exibição.
            CONSTRAINT ck_catalogos_m6_unidade CHECK (
                tipo <> 'unidades' OR (
                    COALESCE(jsonb_typeof(conteudo->'inteira'), '') = 'boolean'
                    AND COALESCE(jsonb_typeof(conteudo->'maximo'), '') IN ('number', 'null')
                    AND COALESCE(jsonb_typeof(conteudo->'casas_exibicao'), '') = 'number'
                )
            )
        )
        """
    )

    op.execute(
        """
        CREATE TABLE observacoes_m6 (
            id VARCHAR(64) PRIMARY KEY,
            -- Sem escala fixa: preserva o decimal recebido (há valores com mais de 4 casas).
            valor NUMERIC NOT NULL,
            conteudo JSONB NOT NULL,
            status TEXT NOT NULL DEFAULT 'rascunho',
            demonstracao BOOLEAN NOT NULL DEFAULT false,
            divulgacao_bloqueada BOOLEAN NOT NULL DEFAULT false,
            motivo_bloqueio TEXT,
            publicado_por INTEGER REFERENCES usuarios (id),
            publicado_em TIMESTAMPTZ,

            indicador_codigo TEXT GENERATED ALWAYS AS (conteudo->>'indicador_codigo') STORED NOT NULL,
            categoria_codigo TEXT GENERATED ALWAYS AS (conteudo->>'categoria_codigo') STORED,
            territorio_codigo TEXT GENERATED ALWAYS AS (conteudo->>'territorio_codigo') STORED NOT NULL,
            unidade_codigo TEXT GENERATED ALWAYS AS (conteudo->>'unidade_codigo') STORED NOT NULL,
            fonte_codigo TEXT GENERATED ALWAYS AS (conteudo->>'fonte_codigo') STORED NOT NULL,
            qualificador TEXT GENERATED ALWAYS AS (conteudo->>'qualificador') STORED NOT NULL,
            referencia_tipo TEXT GENERATED ALWAYS AS (conteudo->'referencia'->>'tipo') STORED NOT NULL,
            ano_inicio INTEGER GENERATED ALWAYS AS
                ((conteudo->'referencia'->>'ano_inicio')::integer) STORED NOT NULL,
            ano_fim INTEGER GENERATED ALWAYS AS
                ((conteudo->'referencia'->>'ano_fim')::integer) STORED NOT NULL,
            mes INTEGER GENERATED ALWAYS AS ((conteudo->'referencia'->>'mes')::integer) STORED,

            -- Um CHECK que resulta em NULL é aceito; por isso campos ausentes viram ''.
            CONSTRAINT ck_observacoes_m6_id CHECK (
                id ~ '^[0-9a-f]{64}$' AND conteudo->>'id' IS NOT DISTINCT FROM id
            ),
            -- O decimal trafega como texto no contrato e precisa coincidir com a coluna.
            CONSTRAINT ck_observacoes_m6_valor CHECK (
                valor >= 0
                AND COALESCE(jsonb_typeof(conteudo->'valor'), '') = 'string'
                AND (conteudo->>'valor')::numeric IS NOT DISTINCT FROM valor
            ),
            CONSTRAINT ck_observacoes_m6_status CHECK (status IN ('rascunho', 'publicado')),
            CONSTRAINT ck_observacoes_m6_qualificador CHECK (qualificador IN ('igual', 'maior_que')),
            CONSTRAINT ck_observacoes_m6_referencia CHECK (
                referencia_tipo IN ('anual', 'mensal', 'acumulada', 'levantamento', 'retrato')
                AND ano_inicio BETWEEN 1900 AND 2100
                AND ano_fim BETWEEN ano_inicio AND 2100
                AND (referencia_tipo = 'mensal') = (mes IS NOT NULL)
                AND (mes IS NULL OR mes BETWEEN 1 AND 12)
                AND (referencia_tipo NOT IN ('anual', 'mensal', 'retrato') OR ano_inicio = ano_fim)
                AND (referencia_tipo = 'retrato')
                    = (conteudo->'referencia'->>'data_extracao' IS NOT NULL)
            ),
            CONSTRAINT ck_observacoes_m6_completa CHECK (
                COALESCE(jsonb_typeof(conteudo->'temas'), '') = 'array'
                AND conteudo->'temas' <> '[]'::jsonb
                AND COALESCE(jsonb_typeof(conteudo->'proveniencias'), '') = 'array'
                AND conteudo->'proveniencias' <> '[]'::jsonb
            ),
            -- CNAE é uma classificação própria e opcional, nunca inferida da categoria.
            CONSTRAINT ck_observacoes_m6_cnae CHECK (
                conteudo->>'codigo_cnae' IS NULL
                OR conteudo->>'codigo_cnae' ~ '^[0-9]{4}-[0-9]/[0-9]{2}$'
            ),
            CONSTRAINT ck_observacoes_m6_bloqueio CHECK (
                NOT divulgacao_bloqueada OR length(btrim(COALESCE(motivo_bloqueio, ''))) > 0
            ),
            CONSTRAINT ck_observacoes_m6_publicacao CHECK (
                status <> 'publicado' OR (
                    NOT divulgacao_bloqueada
                    AND publicado_por IS NOT NULL
                    AND publicado_em IS NOT NULL
                )
            )
        )
        """
    )
    # A identidade não inclui o valor: uma correção não pode virar outra observação.
    op.execute(
        """
        CREATE UNIQUE INDEX uq_observacoes_m6_identidade ON observacoes_m6 (
            indicador_codigo, territorio_codigo, categoria_codigo, unidade_codigo,
            fonte_codigo, (conteudo->'referencia')
        ) NULLS NOT DISTINCT
        """
    )
    op.execute(
        """
        CREATE INDEX ix_observacoes_m6_publicadas
        ON observacoes_m6 (indicador_codigo, territorio_codigo, ano_inicio)
        WHERE status = 'publicado'
        """
    )
    op.execute("CREATE INDEX ix_observacoes_m6_temas ON observacoes_m6 USING gin ((conteudo->'temas'))")

    op.execute(
        """
        CREATE FUNCTION validar_observacao_m6() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE
            unidade JSONB;
            referencia RECORD;
        BEGIN
            FOR referencia IN
                SELECT * FROM (VALUES
                    ('indicadores', NEW.conteudo->>'indicador_codigo'),
                    ('territorios', NEW.conteudo->>'territorio_codigo'),
                    ('unidades', NEW.conteudo->>'unidade_codigo'),
                    ('fontes', NEW.conteudo->>'fonte_codigo'),
                    ('categorias', NEW.conteudo->>'categoria_codigo')
                ) AS r (tipo, codigo)
                WHERE r.codigo IS NOT NULL
                UNION ALL
                SELECT 'temas', tema
                FROM jsonb_array_elements_text(
                    CASE jsonb_typeof(NEW.conteudo->'temas')
                        WHEN 'array' THEN NEW.conteudo->'temas' ELSE '[]'::jsonb END
                ) AS tema
            LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM catalogos_m6 c
                    WHERE c.tipo = referencia.tipo AND c.codigo = referencia.codigo
                ) THEN
                    RAISE EXCEPTION 'Código ausente do catálogo %: %', referencia.tipo, referencia.codigo
                        USING ERRCODE = 'foreign_key_violation';
                END IF;
            END LOOP;

            SELECT conteudo INTO unidade FROM catalogos_m6
            WHERE tipo = 'unidades' AND codigo = NEW.conteudo->>'unidade_codigo';
            IF (unidade->>'inteira')::boolean AND NEW.valor <> trunc(NEW.valor) THEN
                RAISE EXCEPTION 'A unidade % exige valor inteiro: %', unidade->>'nome', NEW.valor
                    USING ERRCODE = 'check_violation';
            END IF;
            IF unidade->>'maximo' IS NOT NULL AND NEW.valor > (unidade->>'maximo')::numeric THEN
                RAISE EXCEPTION 'Valor acima do máximo da unidade % (%): %',
                    unidade->>'nome', unidade->>'maximo', NEW.valor
                    USING ERRCODE = 'check_violation';
            END IF;
            RETURN NEW;
        END
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER tg_observacoes_m6_validar
        BEFORE INSERT OR UPDATE OF valor, conteudo ON observacoes_m6
        FOR EACH ROW EXECUTE FUNCTION validar_observacao_m6()
        """
    )

    op.execute(
        """
        CREATE FUNCTION proteger_catalogo_m6() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM observacoes_m6 o
                WHERE CASE OLD.tipo
                    WHEN 'indicadores' THEN o.indicador_codigo = OLD.codigo
                    WHEN 'territorios' THEN o.territorio_codigo = OLD.codigo
                    WHEN 'unidades' THEN o.unidade_codigo = OLD.codigo
                    WHEN 'fontes' THEN o.fonte_codigo = OLD.codigo
                    WHEN 'categorias' THEN o.categoria_codigo = OLD.codigo
                    WHEN 'temas' THEN o.conteudo->'temas' ? OLD.codigo
                END
            ) THEN
                RAISE EXCEPTION 'O item %/% é usado por observações e não pode ser removido.',
                    OLD.tipo, OLD.codigo USING ERRCODE = 'foreign_key_violation';
            END IF;
            RETURN OLD;
        END
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER tg_catalogos_m6_proteger
        BEFORE DELETE ON catalogos_m6
        FOR EACH ROW EXECUTE FUNCTION proteger_catalogo_m6()
        """
    )

    op.execute(
        """
        CREATE TABLE cargas_m6 (
            hash_pacote VARCHAR(64) PRIMARY KEY,
            sha256_origem VARCHAR(64) NOT NULL,
            quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
            aplicado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def downgrade() -> None:
    possui_observacoes = op.get_bind().execute(
        sa.text("SELECT EXISTS(SELECT 1 FROM observacoes_m6)")
    ).scalar_one()
    if possui_observacoes:
        raise RuntimeError(
            "Há observações da M6 no banco. Exporte-as antes do downgrade; a reversão "
            "removeria os dados e o histórico de publicação."
        )
    op.execute("DROP TABLE cargas_m6")
    op.execute("DROP TRIGGER tg_catalogos_m6_proteger ON catalogos_m6")
    op.execute("DROP FUNCTION proteger_catalogo_m6()")
    op.execute("DROP TABLE observacoes_m6")
    op.execute("DROP FUNCTION validar_observacao_m6()")
    op.execute("DROP TABLE catalogos_m6")
