from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, DbConnection
from app.schemas.dado_indicador import (
    BloqueioRequest,
    DadoAdminResponse,
    DadoCreate,
    DadoUpdate,
    Situacao,
    StatusDado,
)
from app.services.dado_indicador_service import DadoIndicadorService

_ERRO = {"content": {"application/json": {"example": {"detail": "Mensagem do erro."}}}}
_NAO_ENCONTRADO = {404: {"description": "Dado não encontrado.", **_ERRO}}
_CONFLITO = {
    409: {
        "description": "Dado ou indicador arquivado, dado bloqueado ou combinação já existente.",
        **_ERRO,
    }
}
_VALIDACAO = {422: {"description": "Campos inválidos ou incompatíveis com a definição do indicador."}}

router = APIRouter(
    prefix="/admin/dados-indicadores",
    tags=["Administração de dados do indicador"],
    responses={
        401: {"description": "Token ausente, inválido ou expirado.", **_ERRO},
        403: {"description": "Usuário fora da equipe administrativa.", **_ERRO},
    },
)


@router.get("", response_model=list[DadoAdminResponse], responses=_VALIDACAO)
def listar(
    _: AdminUser,
    connection: DbConnection,
    indicador: Annotated[str | None, Query(description="Código do indicador.")] = None,
    situacao: Situacao = "ativos",
    status_: Annotated[StatusDado | None, Query(alias="status")] = None,
) -> list[DadoAdminResponse]:
    """Dados ativos (padrão), arquivados ou todos, em qualquer status, inclusive de indicadores arquivados."""
    return DadoIndicadorService(connection).listar(indicador, situacao, status_)


@router.get("/{dado_id}", response_model=DadoAdminResponse, responses=_NAO_ENCONTRADO)
def obter(dado_id: str, _: AdminUser, connection: DbConnection) -> DadoAdminResponse:
    return DadoIndicadorService(connection).obter(dado_id)


@router.post(
    "", response_model=DadoAdminResponse, status_code=status.HTTP_201_CREATED, responses={**_CONFLITO, **_VALIDACAO}
)
def criar(dados: DadoCreate, _: AdminUser, connection: DbConnection) -> DadoAdminResponse:
    """Cadastra um rascunho em Santa Rita do Sapucaí; unidade e setores vêm da definição."""
    return DadoIndicadorService(connection).criar(dados)


@router.patch(
    "/{dado_id}", response_model=DadoAdminResponse, responses={**_NAO_ENCONTRADO, **_CONFLITO, **_VALIDACAO}
)
def corrigir(dado_id: str, dados: DadoUpdate, _: AdminUser, connection: DbConnection) -> DadoAdminResponse:
    """Correção parcial que preserva o id; em um publicado, vale na consulta pública na hora."""
    return DadoIndicadorService(connection).corrigir(dado_id, dados)


@router.post("/{dado_id}/publicar", response_model=DadoAdminResponse, responses={**_NAO_ENCONTRADO, **_CONFLITO})
def publicar(dado_id: str, _: AdminUser, connection: DbConnection) -> DadoAdminResponse:
    return DadoIndicadorService(connection).publicar(dado_id)


@router.post("/{dado_id}/despublicar", response_model=DadoAdminResponse, responses={**_NAO_ENCONTRADO, **_CONFLITO})
def despublicar(dado_id: str, _: AdminUser, connection: DbConnection) -> DadoAdminResponse:
    """Volta a rascunho sem apagar o conteúdo."""
    return DadoIndicadorService(connection).despublicar(dado_id)


@router.post("/{dado_id}/arquivar", response_model=DadoAdminResponse, responses=_NAO_ENCONTRADO)
def arquivar(dado_id: str, _: AdminUser, connection: DbConnection) -> DadoAdminResponse:
    """Retira da consulta preservando status e bloqueio."""
    return DadoIndicadorService(connection).arquivar(dado_id)


@router.post("/{dado_id}/restaurar", response_model=DadoAdminResponse, responses=_NAO_ENCONTRADO)
def restaurar(dado_id: str, _: AdminUser, connection: DbConnection) -> DadoAdminResponse:
    """Volta à situação anterior: publicado reaparece se elegível; bloqueio é mantido."""
    return DadoIndicadorService(connection).restaurar(dado_id)


@router.post(
    "/{dado_id}/bloquear",
    response_model=DadoAdminResponse,
    responses={**_NAO_ENCONTRADO, **_CONFLITO, **_VALIDACAO},
)
def bloquear(dado_id: str, dados: BloqueioRequest, _: AdminUser, connection: DbConnection) -> DadoAdminResponse:
    """Decisão explícita com motivo; nunca automática por valor pequeno."""
    return DadoIndicadorService(connection).bloquear(dado_id, dados.motivo)


@router.post("/{dado_id}/desbloquear", response_model=DadoAdminResponse, responses={**_NAO_ENCONTRADO, **_CONFLITO})
def desbloquear(dado_id: str, _: AdminUser, connection: DbConnection) -> DadoAdminResponse:
    return DadoIndicadorService(connection).desbloquear(dado_id)
