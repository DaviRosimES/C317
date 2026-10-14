from fastapi import APIRouter, status

from app.api.deps import AdminUser, DbConnection
from app.schemas.indicador import (
    IndicadorCreate,
    IndicadorResponse,
    IndicadorUpdate,
    StatusLancamento,
)
from app.services.indicador_service import IndicadorService

_ERRO = {"content": {"application/json": {"example": {"detail": "Mensagem do erro."}}}}

router = APIRouter(
    prefix="/admin/indicadores",
    tags=["Administração de indicadores"],
    responses={
        401: {"description": "Token ausente, inválido ou expirado.", **_ERRO},
        403: {"description": "Usuário fora da equipe administrativa.", **_ERRO},
    },
)


@router.get("", response_model=list[IndicadorResponse])
def listar(
    _: AdminUser, connection: DbConnection, status: StatusLancamento | None = None
) -> list[IndicadorResponse]:
    """Lista os lançamentos, inclusive rascunhos, opcionalmente filtrados por status."""
    return IndicadorService(connection).listar(status)


@router.get(
    "/{indicador_id}",
    response_model=IndicadorResponse,
    responses={404: {"description": "Lançamento não encontrado.", **_ERRO}},
)
def obter(indicador_id: int, _: AdminUser, connection: DbConnection) -> IndicadorResponse:
    return IndicadorService(connection).obter(indicador_id)


@router.post(
    "",
    response_model=IndicadorResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"description": "Já existe lançamento para o tipo, período e CNAE.", **_ERRO},
        422: {"description": "Campos ausentes ou valores incompatíveis com a unidade."},
    },
)
def criar(dados: IndicadorCreate, _: AdminUser, connection: DbConnection) -> IndicadorResponse:
    """Cadastra um lançamento como rascunho; ele só aparece na consulta pública após publicado."""
    return IndicadorService(connection).criar(dados)


@router.patch(
    "/{indicador_id}",
    response_model=IndicadorResponse,
    responses={
        404: {"description": "Lançamento não encontrado.", **_ERRO},
        409: {"description": "A correção colide com outro lançamento.", **_ERRO},
        422: {"description": "Campos ou valores inválidos após a correção."},
    },
)
def atualizar(
    indicador_id: int, dados: IndicadorUpdate, admin: AdminUser, connection: DbConnection
) -> IndicadorResponse:
    """Corrige um lançamento. Um lançamento publicado continua publicado."""
    return IndicadorService(connection).atualizar(indicador_id, dados, admin.id)


@router.post(
    "/{indicador_id}/publicar",
    response_model=IndicadorResponse,
    responses={404: {"description": "Lançamento não encontrado.", **_ERRO}},
)
def publicar(indicador_id: int, admin: AdminUser, connection: DbConnection) -> IndicadorResponse:
    """Publica o lançamento e registra o responsável. Publicar de novo não altera nada."""
    return IndicadorService(connection).publicar(indicador_id, admin.id)
