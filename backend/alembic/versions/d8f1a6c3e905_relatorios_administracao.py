"""Relatórios: arquivamento independente do status e nome original do PDF enviado.

Revision ID: d8f1a6c3e905
Revises: b7e2d9c4a610
"""

from alembic import op
import sqlalchemy as sa


revision = "d8f1a6c3e905"
down_revision = "b7e2d9c4a610"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Arquivar preserva o status (rascunho/publicado); restaurar só limpa esta marca.
    op.add_column(
        "relatorios",
        sa.Column("arquivado", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    # Nome do arquivo como enviado, só para apresentação; o armazenamento usa outro nome.
    op.add_column("relatorios", sa.Column("arquivo_nome", sa.Text()))
    op.create_check_constraint(
        "ck_relatorios_arquivo_nome",
        "relatorios",
        "arquivo_nome IS NULL OR (arquivo_url IS NOT NULL AND length(btrim(arquivo_nome)) > 0)",
    )


def downgrade() -> None:
    connection = op.get_bind()
    arquivados = connection.execute(
        sa.text("SELECT EXISTS(SELECT 1 FROM relatorios WHERE arquivado)")
    ).scalar_one()
    if arquivados:
        raise RuntimeError(
            "O esquema anterior não distingue relatórios arquivados: eles voltariam à consulta "
            "pública conforme o status. Restaure ou exporte os arquivados antes do downgrade."
        )
    op.drop_constraint("ck_relatorios_arquivo_nome", "relatorios", type_="check")
    op.drop_column("relatorios", "arquivo_nome")
    op.drop_column("relatorios", "arquivado")
