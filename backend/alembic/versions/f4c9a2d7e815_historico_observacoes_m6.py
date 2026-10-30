"""Histórico das ações administrativas sobre as observações da M6.

Registra cadastro, correção, publicação, despublicação, bloqueio e desbloqueio
fora de `conteudo`: o JSON da observação continua igual ao do pacote, e o
carregador não confunde uma ação administrativa com um conflito de dados.

Revision ID: f4c9a2d7e815
Revises: e3b8d41f6a27
"""

from alembic import op
import sqlalchemy as sa


revision = "f4c9a2d7e815"
down_revision = "e3b8d41f6a27"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE historico_observacoes_m6 (
            id BIGSERIAL PRIMARY KEY,
            observacao_id VARCHAR(64) NOT NULL REFERENCES observacoes_m6 (id) ON DELETE CASCADE,
            evento TEXT NOT NULL,
            usuario_id INTEGER REFERENCES usuarios (id),
            registrado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
            detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
            CONSTRAINT ck_historico_observacoes_m6_evento CHECK (
                evento IN (
                    'cadastro', 'correcao', 'publicacao', 'despublicacao', 'bloqueio', 'desbloqueio'
                )
            )
        )
        """
    )
    op.execute(
        """
        CREATE INDEX ix_historico_observacoes_m6_observacao
        ON historico_observacoes_m6 (observacao_id, registrado_em, id)
        """
    )


def downgrade() -> None:
    possui_historico = op.get_bind().execute(
        sa.text("SELECT EXISTS(SELECT 1 FROM historico_observacoes_m6)")
    ).scalar_one()
    if possui_historico:
        raise RuntimeError(
            "Há histórico de ações administrativas da M6. Exporte-o antes do downgrade."
        )
    op.execute("DROP TABLE historico_observacoes_m6")
