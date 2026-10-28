from fastapi import APIRouter, status

from app.api.deps import AdminUser, DbConnection
from app.api.routes.observacoes import FiltrosObservacao
from app.schemas.observacao import (
    BloqueioRequest,
    ObservacaoAdminResponse,
    ObservacaoCreate,
    ObservacaoUpdate,
    StatusObservacao,
)
from app.services.observacao_service import ObservacaoService

_ERRO = {"content": {"application/json": {"example": {"detail": "Mensagem do erro."}}}}
_NAO_ENCONTRADA = {404: {"description": "Observação não encontrada.", **_ERRO}}

router = APIRouter(
    prefix="/admin/observacoes",
    tags=["Administração de observações (M6)"],
    responses={
        401: {"description": "Token ausente, inválido ou expirado.", **_ERRO},
        403: {"description": "Usuário fora da equipe administrativa.", **_ERRO},
    },
)


@router.get("", response_model=list[ObservacaoAdminResponse])
def listar(
    _: AdminUser,
    connection: DbConnection,
    filtros: FiltrosObservacao,
    status: StatusObservacao | None = None,
    divulgacao_bloqueada: bool | None = None,
) -> list[ObservacaoAdminResponse]:
    """Todas as observações, inclusive rascunhos e bloqueadas."""
    return ObservacaoService(connection).listar_admin(
        status=status, divulgacao_bloqueada=divulgacao_bloqueada, **filtros
    )


@router.get("/{observacao_id}", response_model=ObservacaoAdminResponse, responses=_NAO_ENCONTRADA)
def obter(observacao_id: str, _: AdminUser, connection: DbConnection) -> ObservacaoAdminResponse:
    return ObservacaoService(connection).obter_admin(observacao_id)


@router.post(
    "",
    response_model=ObservacaoAdminResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"description": "Já existe observação com a mesma identidade.", **_ERRO},
        422: {"description": "Código desconhecido, referência ou valor incompatível."},
    },
)
def criar(
    dados: ObservacaoCreate, admin: AdminUser, connection: DbConnection
) -> ObservacaoAdminResponse:
    """Cadastra uma observação completa como rascunho; a identidade é calculada pela API."""
    return ObservacaoService(connection).criar(dados, admin.id)


@router.patch(
    "/{observacao_id}",
    response_model=ObservacaoAdminResponse,
    responses={**_NAO_ENCONTRADA, 422: {"description": "Valor incompatível com a unidade."}},
)
def corrigir(
    observacao_id: str, dados: ObservacaoUpdate, admin: AdminUser, connection: DbConnection
) -> ObservacaoAdminResponse:
    """Corrige valor, qualificador ou notas. Os campos da identidade não mudam."""
    return ObservacaoService(connection).corrigir(observacao_id, dados, admin.id)


@router.post(
    "/{observacao_id}/publicar",
    response_model=ObservacaoAdminResponse,
    responses={**_NAO_ENCONTRADA, 422: {"description": "Divulgação bloqueada.", **_ERRO}},
)
def publicar(observacao_id: str, admin: AdminUser, connection: DbConnection) -> ObservacaoAdminResponse:
    return ObservacaoService(connection).publicar(observacao_id, admin.id)


@router.post(
    "/{observacao_id}/despublicar", response_model=ObservacaoAdminResponse, responses=_NAO_ENCONTRADA
)
def despublicar(observacao_id: str, _: AdminUser, connection: DbConnection) -> ObservacaoAdminResponse:
    return ObservacaoService(connection).despublicar(observacao_id)


@router.post(
    "/{observacao_id}/bloquear", response_model=ObservacaoAdminResponse, responses=_NAO_ENCONTRADA
)
def bloquear(
    observacao_id: str, dados: BloqueioRequest, _: AdminUser, connection: DbConnection
) -> ObservacaoAdminResponse:
    """Bloqueia a divulgação (ex.: amostra insuficiente); uma observação publicada sai da consulta."""
    return ObservacaoService(connection).bloquear(observacao_id, dados.motivo)


@router.post(
    "/{observacao_id}/desbloquear", response_model=ObservacaoAdminResponse, responses=_NAO_ENCONTRADA
)
def desbloquear(observacao_id: str, _: AdminUser, connection: DbConnection) -> ObservacaoAdminResponse:
    """Remove o bloqueio; a observação continua em rascunho até ser publicada."""
    return ObservacaoService(connection).desbloquear(observacao_id)
