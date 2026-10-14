"""Hash de senha dos usuários administrativos.

Revision ID: a1d4c2e9b7f3
Revises: 6e2c3170b001
"""

from alembic import op
import sqlalchemy as sa


revision = "a1d4c2e9b7f3"
down_revision = "6e2c3170b001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Nulo para usuários existentes: sem hash, a conta não consegue autenticar.
    op.add_column("usuarios", sa.Column("senha_hash", sa.Text()))


def downgrade() -> None:
    op.drop_column("usuarios", "senha_hash")
