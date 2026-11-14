from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbConnection
from app.schemas.consulta_indicadores import (
    ConsultaResponse,
    DadoPublicoDetalhe,
    FontePublica,
    IndicadorConsulta,
    OpcoesConsultaResponse,
)
from app.services.consulta_indicadores_service import ConsultaIndicadoresService

router = APIRouter(prefix="/consulta", tags=["Consulta de indicadores"])

_ERRO = {"content": {"application/json": {"example": {"detail": "Mensagem do erro."}}}}
_VALIDACAO = {422: {"description": "Setor ou período desconhecido.", **_ERRO}}
Setor = Annotated[str | None, Query(description="Código do Setor do Observatório; omitido = todos os setores.")]
Periodo = Annotated[
    str | None,
    Query(description="Chave do Ano/Período (ex.: `anual-2024`, `acumulada-2000-2024`); omitido = todos."),
]


@router.get("/opcoes", response_model=OpcoesConsultaResponse, responses=_VALIDACAO)
def opcoes(connection: DbConnection, setor: Setor = None) -> OpcoesConsultaResponse:
    """Setores com dados elegíveis e os períodos disponíveis no setor informado."""
    return ConsultaIndicadoresService(connection).opcoes(setor)


@router.get("/indicadores", response_model=ConsultaResponse, responses=_VALIDACAO)
def consultar(connection: DbConnection, setor: Setor = None, periodo: Periodo = None) -> ConsultaResponse:
    """Indicadores com ao menos um dado elegível na seleção, cada um uma vez e só com esses dados.

    Uma combinação sem dados devolve lista vazia; nunca é substituída por todos os dados.
    """
    return ConsultaIndicadoresService(connection).consultar(setor, periodo)


@router.get(
    "/indicadores/{codigo}",
    response_model=IndicadorConsulta,
    responses={**_VALIDACAO, 404: {"description": "Indicador sem dados elegíveis nesta seleção.", **_ERRO}},
)
def indicador(codigo: str, connection: DbConnection, setor: Setor = None, periodo: Periodo = None) -> IndicadorConsulta:
    return ConsultaIndicadoresService(connection).indicador(codigo, setor, periodo)


@router.get(
    "/dados/{dado_id}",
    response_model=DadoPublicoDetalhe,
    responses={404: {"description": "Dado inexistente ou não elegível ao público.", **_ERRO}},
)
def dado(dado_id: str, connection: DbConnection) -> DadoPublicoDetalhe:
    return ConsultaIndicadoresService(connection).dado(dado_id)


@router.get("/fontes", response_model=list[FontePublica])
def fontes(connection: DbConnection) -> list[FontePublica]:
    """Fontes dos dados elegíveis, para a página Sobre."""
    return ConsultaIndicadoresService(connection).fontes()
