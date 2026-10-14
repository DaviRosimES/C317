from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import settings
from app.core.errors import registrar_handlers

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API do sistema de turismo da Prefeitura.",
)

registrar_handlers(app)
app.include_router(api_router, prefix=settings.api_prefix)
