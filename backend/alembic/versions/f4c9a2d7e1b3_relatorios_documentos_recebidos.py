"""Relatórios recebidos: número, tipo, link externo e metadados desconhecidos.

Revision ID: f4c9a2d7e1b3
Revises: e3b8d41f6a27
"""

from alembic import op
import sqlalchemy as sa


revision = "f4c9a2d7e1b3"
down_revision = "e3b8d41f6a27"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Número oficial ("004/2025") e tipo só quando a fonte os informa; nulo não é inventado.
    op.add_column("relatorios", sa.Column("numero", sa.Text()))
    op.add_column("relatorios", sa.Column("tipo", sa.Text()))
    # Documento publicado pelo Observatório em outro endereço (ex.: Google Drive), sem cópia local.
    op.add_column("relatorios", sa.Column("link_externo", sa.Text()))
    op.create_check_constraint(
        "ck_relatorios_numero", "relatorios", "numero IS NULL OR length(btrim(numero)) > 0"
    )
    op.create_check_constraint(
        "ck_relatorios_tipo",
        "relatorios",
        "tipo IS NULL OR tipo IN ('relatorio_tecnico', 'peca_divulgacao')",
    )
    op.create_check_constraint(
        "ck_relatorios_link_externo", "relatorios", "link_externo IS NULL OR link_externo ~ '^https://'"
    )
    op.create_unique_constraint("uq_relatorios_link_externo", "relatorios", ["link_externo"])

    # Cada relatório é acessado por exatamente um destino: o PDF da API ou o link externo.
    op.alter_column("relatorios", "arquivo_url", existing_type=sa.String(), nullable=True)
    op.create_check_constraint(
        "ck_relatorios_um_destino", "relatorios", "num_nonnulls(arquivo_url, link_externo) = 1"
    )
    # Data de publicação e referência desconhecidas ficam nulas, nunca presumidas.
    op.alter_column("relatorios", "data_publicacao", existing_type=sa.Date(), nullable=True)
    op.alter_column("relatorios", "periodo_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    connection = op.get_bind()
    incompativel = connection.execute(
        sa.text(
            """
            SELECT EXISTS(
                SELECT 1 FROM relatorios
                WHERE link_externo IS NOT NULL OR data_publicacao IS NULL OR periodo_id IS NULL
            )
            """
        )
    ).scalar_one()
    if incompativel:
        raise RuntimeError(
            "O esquema anterior exige PDF local, data de publicação e referência em todos os "
            "relatórios. Exporte os relatórios com link externo ou metadados desconhecidos "
            "antes do downgrade; não preencha datas ou arquivos fictícios para contorná-lo."
        )

    op.alter_column("relatorios", "periodo_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("relatorios", "data_publicacao", existing_type=sa.Date(), nullable=False)
    op.drop_constraint("ck_relatorios_um_destino", "relatorios", type_="check")
    op.alter_column("relatorios", "arquivo_url", existing_type=sa.String(), nullable=False)
    op.drop_constraint("uq_relatorios_link_externo", "relatorios", type_="unique")
    op.drop_constraint("ck_relatorios_link_externo", "relatorios", type_="check")
    op.drop_constraint("ck_relatorios_tipo", "relatorios", type_="check")
    op.drop_constraint("ck_relatorios_numero", "relatorios", type_="check")
    op.drop_column("relatorios", "link_externo")
    op.drop_column("relatorios", "tipo")
    op.drop_column("relatorios", "numero")
