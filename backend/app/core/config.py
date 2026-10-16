import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BACKEND_DIR.parent / ".env")


class Settings:
    app_name: str = "API Turismo - Prefeitura"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    auth_token_expire_minutes: int = int(os.getenv("AUTH_TOKEN_EXPIRE_MINUTES", "60"))
    # Pasta dos PDFs; `relatorios.arquivo_url` guarda o caminho relativo a ela.
    relatorios_dir: Path = BACKEND_DIR / os.getenv("RELATORIOS_DIR", "arquivos/relatorios")
    cors_origins: list[str] = [
        origem.strip()
        for origem in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origem.strip()
    ]

    @property
    def auth_secret_key(self) -> str:
        # Lido sob demanda: rotas públicas funcionam mesmo sem a variável definida.
        return os.environ["AUTH_SECRET_KEY"]


settings = Settings()
