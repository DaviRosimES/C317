"""Indicadores municipais, catálogo CNAE e períodos anuais.

Revision ID: 6e2c3170b001
Revises: fb26bd09dac1
"""

from alembic import op
import sqlalchemy as sa


revision = "6e2c3170b001"
down_revision = "fb26bd09dac1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("setores", sa.Column("codigo_cnae", sa.String(10)))
    op.add_column(
        "setores",
        sa.Column("provisorio", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column("setores", sa.Column("fonte_cnae", sa.Text()))
    op.create_unique_constraint("uq_setores_codigo_cnae", "setores", ["codigo_cnae"])
    op.create_check_constraint(
        "ck_setores_codigo_cnae",
        "setores",
        "codigo_cnae IS NULL OR codigo_cnae ~ '^[0-9]{4}-[0-9]/[0-9]{2}$'",
    )

    op.alter_column("periodos", "mes", existing_type=sa.Integer(), nullable=True)
    # O índice original cobre meses; este impede dois períodos anuais no mesmo ano.
    op.create_index(
        "uq_periodos_ano_anual",
        "periodos",
        ["ano"],
        unique=True,
        postgresql_where=sa.text("mes IS NULL"),
    )

    op.create_table(
        "tipos_indicadores",
        sa.Column("codigo", sa.String(), primary_key=True),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=False),
        sa.Column("unidade", sa.String(), nullable=False),
        sa.Column("escopo", sa.String(), nullable=False),
        sa.Column("fonte_referencia", sa.Text()),
        sa.Column("provisorio", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.CheckConstraint(
            "escopo IN ('municipal', 'cnae', 'estabelecimento')",
            name="ck_tipos_indicadores_escopo",
        ),
    )
    # Tipos anteriores permanecem válidos; sua unidade precisa de revisão explícita.
    op.execute(
        """
        INSERT INTO tipos_indicadores
            (codigo, nome, descricao, unidade, escopo, provisorio)
        SELECT DISTINCT tipo, tipo, 'Tipo legado: revisar definição e unidade.',
               'nao_definida', 'estabelecimento', true
        FROM indicadores
        """
    )
    op.alter_column(
        "indicadores", "estabelecimento_id", existing_type=sa.Integer(), nullable=True
    )
    op.add_column("indicadores", sa.Column("setor_id", sa.Integer()))
    op.add_column(
        "indicadores",
        sa.Column("demonstracao", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_foreign_key(
        "fk_indicadores_setor", "indicadores", "setores", ["setor_id"], ["id"]
    )
    op.create_foreign_key(
        "fk_indicadores_tipo",
        "indicadores",
        "tipos_indicadores",
        ["tipo"],
        ["codigo"],
    )
    op.create_check_constraint(
        "ck_indicadores_alvo",
        "indicadores",
        "NOT (estabelecimento_id IS NOT NULL AND setor_id IS NOT NULL)",
    )
    op.create_check_constraint(
        "ck_indicadores_origem", "indicadores", "length(btrim(origem)) > 0"
    )
    op.create_index(
        "uq_indicadores_municipais",
        "indicadores",
        ["tipo", "periodo_id"],
        unique=True,
        postgresql_where=sa.text("estabelecimento_id IS NULL AND setor_id IS NULL"),
    )
    op.create_index(
        "uq_indicadores_cnae",
        "indicadores",
        ["tipo", "periodo_id", "setor_id"],
        unique=True,
        postgresql_where=sa.text("estabelecimento_id IS NULL AND setor_id IS NOT NULL"),
    )

    op.create_table(
        "rotas",
        sa.Column("codigo", sa.String(), primary_key=True),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=False),
    )
    op.create_table(
        "setores_rotas",
        sa.Column(
            "setor_id", sa.Integer(), sa.ForeignKey("setores.id"), primary_key=True
        ),
        sa.Column(
            "rota_codigo", sa.String(), sa.ForeignKey("rotas.codigo"), primary_key=True
        ),
        sa.Column("provisorio", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("observacao", sa.Text()),
    )


def downgrade() -> None:
    connection = op.get_bind()
    possui_dados_novos = connection.execute(
        sa.text(
            """
            SELECT EXISTS(SELECT 1 FROM indicadores WHERE estabelecimento_id IS NULL)
                OR EXISTS(SELECT 1 FROM periodos WHERE mes IS NULL)
            """
        )
    ).scalar_one()
    if possui_dados_novos:
        raise RuntimeError(
            "O esquema anterior não representa indicadores agregados ou períodos "
            "anuais. Preserve/exporte esses dados antes de executar o downgrade."
        )

    op.drop_table("setores_rotas")
    op.drop_table("rotas")
    op.drop_index("uq_indicadores_cnae", table_name="indicadores")
    op.drop_index("uq_indicadores_municipais", table_name="indicadores")
    op.drop_constraint("ck_indicadores_origem", "indicadores", type_="check")
    op.drop_constraint("ck_indicadores_alvo", "indicadores", type_="check")
    op.drop_constraint("fk_indicadores_tipo", "indicadores", type_="foreignkey")
    op.drop_constraint("fk_indicadores_setor", "indicadores", type_="foreignkey")
    op.drop_column("indicadores", "demonstracao")
    op.drop_column("indicadores", "setor_id")
    op.alter_column(
        "indicadores", "estabelecimento_id", existing_type=sa.Integer(), nullable=False
    )
    op.drop_table("tipos_indicadores")
    op.drop_index("uq_periodos_ano_anual", table_name="periodos")
    op.alter_column("periodos", "mes", existing_type=sa.Integer(), nullable=False)
    op.drop_constraint("ck_setores_codigo_cnae", "setores", type_="check")
    op.drop_constraint("uq_setores_codigo_cnae", "setores", type_="unique")
    op.drop_column("setores", "fonte_cnae")
    op.drop_column("setores", "provisorio")
    op.drop_column("setores", "codigo_cnae")
