from sqlalchemy.engine import Connection

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.auth import LoginRequest, TokenResponse, UsuarioResponse


class AuthService:
    def __init__(self, connection: Connection):
        self.usuarios = UsuarioRepository(connection)

    def login(self, dados: LoginRequest) -> TokenResponse | None:
        usuario = self.usuarios.get_by_email(dados.email.strip())
        # A senha é verificada mesmo sem usuário, para não revelar e-mails cadastrados.
        senha_valida = verify_password(dados.senha, usuario.senha_hash if usuario else None)
        if usuario is None or not senha_valida:
            return None
        return TokenResponse(
            access_token=create_access_token(usuario.id),
            expires_in=settings.auth_token_expire_minutes * 60,
        )

    def get_usuario(self, usuario_id: int) -> UsuarioResponse | None:
        usuario = self.usuarios.get_by_id(usuario_id)
        return UsuarioResponse.model_validate(usuario._mapping) if usuario else None
