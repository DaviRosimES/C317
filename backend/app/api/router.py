from fastapi import APIRouter

from app.api.routes import (
    admin_indicadores,
    admin_observacoes,
    auth,
    consultas,
    health,
    observacoes,
    relatorios,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(consultas.router)
api_router.include_router(observacoes.router)
api_router.include_router(relatorios.router)
api_router.include_router(auth.router)
api_router.include_router(admin_indicadores.router)
api_router.include_router(admin_observacoes.router)
