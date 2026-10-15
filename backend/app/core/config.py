import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[3] / ".env")


class Settings:
    app_name: str = "API Turismo - Prefeitura"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    auth_token_expire_minutes: int = int(os.getenv("AUTH_TOKEN_EXPIRE_MINUTES", "60"))

    @property
    def auth_secret_key(self) -> str:
        # Lido sob demanda: rotas públicas funcionam mesmo sem a variável definida.
        return os.environ["AUTH_SECRET_KEY"]


settings = Settings()
