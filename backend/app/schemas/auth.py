from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    senha: str = Field(min_length=1, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str
    papel: str
