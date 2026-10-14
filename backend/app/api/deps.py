from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.engine import Connection

from app.core.database import get_connection
from app.core.security import decode_access_token
from app.schemas.auth import UsuarioResponse
from app.services.auth_service import AuthService

bearer = HTTPBearer(auto_error=False)

DbConnection = Annotated[Connection, Depends(get_connection)]


def get_current_user(
    connection: DbConnection,
    credenciais: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> UsuarioResponse:
    nao_autenticado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credenciais is None:
        raise nao_autenticado
    usuario_id = decode_access_token(credenciais.credentials)
    usuario = AuthService(connection).get_usuario(usuario_id) if usuario_id else None
    if usuario is None:
        raise nao_autenticado
    return usuario


def require_admin(
    usuario: Annotated[UsuarioResponse, Depends(get_current_user)],
) -> UsuarioResponse:
    """Dependência das operações administrativas (cadastro e publicação)."""
    if usuario.papel != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito à equipe administrativa.",
        )
    return usuario


CurrentUser = Annotated[UsuarioResponse, Depends(get_current_user)]
AdminUser = Annotated[UsuarioResponse, Depends(require_admin)]
