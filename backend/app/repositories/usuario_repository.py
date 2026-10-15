from sqlalchemy import text
from sqlalchemy.engine import Connection, Row


class UsuarioRepository:
    def __init__(self, connection: Connection):
        self.connection = connection

    def get_by_id(self, usuario_id: int) -> Row | None:
        return self.connection.execute(
            text("SELECT id, nome, email, papel FROM usuarios WHERE id = :id"),
            {"id": usuario_id},
        ).one_or_none()

    def get_by_email(self, email: str) -> Row | None:
        return self.connection.execute(
            text(
                """
                SELECT id, nome, email, papel, senha_hash
                FROM usuarios WHERE lower(email) = lower(:email)
                """
            ),
            {"email": email},
        ).one_or_none()

    def salvar_admin(self, nome: str, email: str, senha_hash: str) -> int:
        """Cria a conta administrativa ou redefine nome, papel e senha de uma existente."""
        return self.connection.execute(
            text(
                """
                INSERT INTO usuarios (nome, email, papel, senha_hash)
                VALUES (:nome, lower(:email), 'admin', :senha_hash)
                ON CONFLICT (email) DO UPDATE
                SET nome = EXCLUDED.nome, papel = 'admin', senha_hash = EXCLUDED.senha_hash
                RETURNING id
                """
            ),
            {"nome": nome, "email": email, "senha_hash": senha_hash},
        ).scalar_one()
