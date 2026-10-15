from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.errors import registrar_handlers

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API do sistema de turismo da Prefeitura.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
registrar_handlers(app)
app.include_router(api_router, prefix=settings.api_prefix)
