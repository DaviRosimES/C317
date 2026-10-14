from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbConnection
from app.schemas.consulta import (
    CnaeResponse,
    Escopo,
    IndicadorPublicoResponse,
    Periodicidade,
    PeriodoResponse,
    RotaResponse,
    TipoIndicadorResponse,
)
from app.services.consulta_service import ConsultaService

router = APIRouter(tags=["Consulta pública"])

_ANO_MES = r"^[0-9]{4}-(0[1-9]|1[0-2])$"


def _ano_mes(valor: str | None) -> tuple[int, int] | None:
    if valor is None:
        return None
    ano, mes = valor.split("-")
    return int(ano), int(mes)


@router.get("/cnaes", response_model=list[CnaeResponse])
def listar_cnaes(connection: DbConnection) -> list[CnaeResponse]:
    """Catálogo de CNAEs; novas categorias cadastradas aparecem automaticamente."""
    return ConsultaService(connection).listar_cnaes()


@router.get("/tipos-indicadores", response_model=list[TipoIndicadorResponse])
def listar_tipos(connection: DbConnection) -> list[TipoIndicadorResponse]:
    return ConsultaService(connection).listar_tipos()


@router.get("/rotas", response_model=list[RotaResponse])
def listar_rotas(connection: DbConnection) -> list[RotaResponse]:
    return ConsultaService(connection).listar_rotas()


@router.get("/periodos", response_model=list[PeriodoResponse])
def listar_periodos(connection: DbConnection) -> list[PeriodoResponse]:
    """Períodos com ao menos um lançamento publicado."""
    return ConsultaService(connection).listar_periodos()


@router.get(
    "/indicadores",
    response_model=list[IndicadorPublicoResponse],
    responses={422: {"description": "Combinação de filtros inválida."}},
)
def listar_indicadores(
    connection: DbConnection,
    tipo: Annotated[list[str] | None, Query(description="Código do tipo; pode repetir.")] = None,
    cnae: Annotated[
        list[str] | None,
        Query(description="Código CNAE; pode repetir. Exclui os totais municipais."),
    ] = None,
    rota: Annotated[list[str] | None, Query(description="Código da rota; pode repetir.")] = None,
    escopo: Escopo | None = None,
    periodicidade: Periodicidade | None = None,
    ano: Annotated[int | None, Query(ge=1900, le=2100)] = None,
    mes: Annotated[int | None, Query(ge=1, le=12, description="Exige o ano.")] = None,
    inicio: Annotated[
        str | None, Query(pattern=_ANO_MES, description="Início do intervalo mensal, AAAA-MM.")
    ] = None,
    fim: Annotated[
        str | None, Query(pattern=_ANO_MES, description="Fim do intervalo mensal, AAAA-MM.")
    ] = None,
) -> list[IndicadorPublicoResponse]:
    """Lançamentos publicados, sem agregação: cada registro mantém seu escopo.

    Uma combinação sem registros devolve lista vazia ("sem dados"); um valor
    igual a zero é devolvido como "0". O intervalo seleciona referências mensais.
    """
    return ConsultaService(connection).listar_indicadores(
        tipos=tipo,
        cnaes=cnae,
        rotas=rota,
        escopo=escopo,
        periodicidade=periodicidade,
        ano=ano,
        mes=mes,
        inicio=_ano_mes(inicio),
        fim=_ano_mes(fim),
    )
