from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings


ALGORITHM = "HS256"

password_hash = PasswordHash.recommended()
# Comparado quando o e-mail não existe, para que o tempo de resposta não revele contas.
_HASH_FICTICIO = password_hash.hash("senha-inexistente")


def hash_password(senha: str) -> str:
    return password_hash.hash(senha)


def verify_password(senha: str, senha_hash: str | None) -> bool:
    if senha_hash is None:
        password_hash.verify(senha, _HASH_FICTICIO)
        return False
    return password_hash.verify(senha, senha_hash)


def create_access_token(usuario_id: int) -> str:
    agora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario_id),
        "iat": agora,
        "exp": agora + timedelta(minutes=settings.auth_token_expire_minutes),
    }
    return jwt.encode(payload, settings.auth_secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """Retorna o id do usuário, ou None se o token for inválido ou estiver expirado."""
    try:
        payload = jwt.decode(
            token,
            settings.auth_secret_key,
            algorithms=[ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
        return int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None
