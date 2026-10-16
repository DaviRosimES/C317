"""Relatórios públicos: fonte, publicação e marca de demonstração.

Revision ID: c5e1f7a3b902
Revises: a1d4c2e9b7f3
"""

from alembic import op
import sqlalchemy as sa


revision = "c5e1f7a3b902"
down_revision = "a1d4c2e9b7f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    arquivo_repetido = connection.execute(
        sa.text(
            "SELECT EXISTS(SELECT 1 FROM relatorios GROUP BY arquivo_url HAVING count(*) > 1)"
        )
    ).scalar_one()
    if arquivo_repetido:
        raise RuntimeError(
            "Há relatórios diferentes apontando para o mesmo arquivo. Corrija o "
            "arquivo de cada relatório antes de aplicar esta revisão."
        )

    # Relatórios existentes ficam como rascunho até que alguém confirme a fonte.
    op.add_column("relatorios", sa.Column("fonte", sa.Text()))
    op.add_column(
        "relatorios",
        sa.Column("status", sa.String(), nullable=False, server_default="rascunho"),
    )
    op.add_column(
        "relatorios",
        sa.Column("demonstracao", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_check_constraint(
        "ck_relatorios_status", "relatorios", "status IN ('rascunho', 'publicado')"
    )
    op.create_check_constraint(
        "ck_relatorios_fonte", "relatorios", "fonte IS NULL OR length(btrim(fonte)) > 0"
    )
    op.create_check_constraint(
        "ck_relatorios_publicado_com_fonte",
        "relatorios",
        "status <> 'publicado' OR fonte IS NOT NULL",
    )
    op.create_unique_constraint("uq_relatorios_arquivo_url", "relatorios", ["arquivo_url"])
    # Relatórios carregados por script (como o da demonstração) não têm autor na equipe.
    op.alter_column("relatorios", "autor_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    connection = op.get_bind()
    sem_autor = connection.execute(
        sa.text("SELECT EXISTS(SELECT 1 FROM relatorios WHERE autor_id IS NULL)")
    ).scalar_one()
    if sem_autor:
        raise RuntimeError(
            "O esquema anterior exige um autor em cada relatório. Atribua o autor ou "
            "exporte os relatórios carregados por script antes de executar o downgrade."
        )

    op.alter_column("relatorios", "autor_id", existing_type=sa.Integer(), nullable=False)
    op.drop_constraint("uq_relatorios_arquivo_url", "relatorios", type_="unique")
    op.drop_constraint("ck_relatorios_publicado_com_fonte", "relatorios", type_="check")
    op.drop_constraint("ck_relatorios_fonte", "relatorios", type_="check")
    op.drop_constraint("ck_relatorios_status", "relatorios", type_="check")
    op.drop_column("relatorios", "demonstracao")
    op.drop_column("relatorios", "status")
    op.drop_column("relatorios", "fonte")
