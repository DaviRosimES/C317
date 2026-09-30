"""initial schema

Revision ID: fb26bd09dac1
Revises: 
Create Date: 2026-09-29 20:47:00.146218

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb26bd09dac1'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "setores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.UniqueConstraint("slug", name="uq_setores_slug"),
    )

    op.create_table(
        "periodos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ano", sa.Integer(), nullable=False),
        sa.Column("mes", sa.Integer(), nullable=False),
        sa.CheckConstraint("mes BETWEEN 1 AND 12", name="ck_periodos_mes"),
        sa.UniqueConstraint("ano", "mes", name="uq_periodos_ano_mes"),
    )

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("papel", sa.String(), nullable=False),
        sa.UniqueConstraint("email", name="uq_usuarios_email"),
    )

    op.create_table(
        "estabelecimentos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("setor_id", sa.Integer(), sa.ForeignKey("setores.id"), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
    )

    op.create_table(
        "indicadores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "estabelecimento_id",
            sa.Integer(),
            sa.ForeignKey("estabelecimentos.id"),
            nullable=False,
        ),
        sa.Column("validado_por", sa.Integer(), sa.ForeignKey("usuarios.id")),
        sa.Column("periodo_id", sa.Integer(), sa.ForeignKey("periodos.id"), nullable=False),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("valor", sa.Numeric(), nullable=False),
        sa.Column("origem", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
    )

    op.create_table(
        "relatorios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("periodo_id", sa.Integer(), sa.ForeignKey("periodos.id"), nullable=False),
        sa.Column("autor_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("titulo", sa.String(), nullable=False),
        sa.Column("arquivo_url", sa.String(), nullable=False),
        sa.Column("data_publicacao", sa.Date(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("relatorios")
    op.drop_table("indicadores")
    op.drop_table("estabelecimentos")
    op.drop_table("usuarios")
    op.drop_table("periodos")
    op.drop_table("setores")
