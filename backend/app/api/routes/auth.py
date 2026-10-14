from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, DbConnection
from app.schemas.auth import LoginRequest, TokenResponse, UsuarioResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
def login(dados: LoginRequest, connection: DbConnection) -> TokenResponse:
    token = AuthService(connection).login(dados)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
        )
    return token


@router.get("/me", response_model=UsuarioResponse)
def me(usuario: CurrentUser) -> UsuarioResponse:
    return usuario
