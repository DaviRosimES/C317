from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import StringConstraints

from app.api.deps import DbConnection
from app.schemas.observacao import (
    CatalogosResponse,
    ObservacaoPublicaResponse,
    PaginaObservacoesPublicas,
    ReferenciaResponse,
    TipoReferencia,
)
from app.services.observacao_service import ObservacaoService

_CNAE = Annotated[str, StringConstraints(pattern=r"^[0-9]{4}-[0-9]/[0-9]{2}$")]


def filtros_observacao(
    tema: Annotated[list[str] | None, Query(description="Código do tema; pode repetir.")] = None,
    indicador: Annotated[list[str] | None, Query(description="Código do indicador; pode repetir.")] = None,
    territorio: Annotated[
        list[str] | None, Query(description="Município, região ou base cadastral; pode repetir.")
    ] = None,
    categoria: Annotated[
        list[str] | None, Query(description="Categoria de origem (recorte da fonte); pode repetir.")
    ] = None,
    classificacao: Annotated[
        list[str] | None,
        Query(description="Classificação das categorias (ex.: setor_sebrae); pode repetir."),
    ] = None,
    codigo_cnae: Annotated[
        list[_CNAE] | None,
        Query(description="CNAE, distinto da categoria estatística; pode repetir."),
    ] = None,
    referencia_tipo: Annotated[
        list[TipoReferencia] | None,
        Query(description="anual, mensal, acumulada, levantamento ou retrato; pode repetir."),
    ] = None,
    ano: Annotated[
        int | None,
        Query(ge=1900, le=2100, description="Referências de um único ano; não inclui acumulados."),
    ] = None,
    ano_inicio: Annotated[
        int | None,
        Query(ge=1900, le=2100, description="Início do intervalo: referências que começam neste ano ou depois."),
    ] = None,
    ano_fim: Annotated[
        int | None,
        Query(ge=1900, le=2100, description="Fim do intervalo: referências que terminam neste ano ou antes."),
    ] = None,
    mes: Annotated[int | None, Query(ge=1, le=12, description="Exige o ano.")] = None,
) -> dict:
    return {
        "tema": tema,
        "indicador": indicador,
        "territorio": territorio,
        "categoria": categoria,
        "classificacao": classificacao,
        "codigo_cnae": codigo_cnae,
        "referencia_tipo": referencia_tipo,
        "ano": ano,
        "ano_inicio": ano_inicio,
        "ano_fim": ano_fim,
        "mes": mes,
    }


FiltrosObservacao = Annotated[dict, Depends(filtros_observacao)]

LIMITE_MAXIMO = 1000


def paginacao(
    limite: Annotated[int, Query(ge=1, le=LIMITE_MAXIMO, description="Itens por página.")] = 200,
    deslocamento: Annotated[int, Query(ge=0, description="Quantos itens pular.")] = 0,
) -> dict:
    return {"limite": limite, "deslocamento": deslocamento}


Paginacao = Annotated[dict, Depends(paginacao)]

router = APIRouter(prefix="/observacoes", tags=["Observações (M6)"])


@router.get("", response_model=PaginaObservacoesPublicas)
def listar(
    connection: DbConnection, filtros: FiltrosObservacao, pagina: Paginacao
) -> PaginaObservacoesPublicas:
    """Observações publicadas e não bloqueadas, com filtros combináveis e paginação.

    `itens` vazio significa "sem dados" para a combinação; um zero vem como "0".
    Código de catálogo desconhecido responde 422, nunca é ignorado.
    """
    return ObservacaoService(connection).listar_publicas(**pagina, **filtros)


@router.get("/catalogos", response_model=CatalogosResponse)
def catalogos(connection: DbConnection) -> CatalogosResponse:
    """Itens de catálogo usados por observações publicadas; nada só de rascunho ou bloqueado."""
    return ObservacaoService(connection).catalogo_publico()


@router.get("/referencias", response_model=list[ReferenciaResponse])
def referencias(connection: DbConnection) -> list[ReferenciaResponse]:
    """Referências distintas com ao menos uma observação publicada."""
    return ObservacaoService(connection).referencias_publicadas()


@router.get(
    "/{observacao_id}",
    response_model=ObservacaoPublicaResponse,
    responses={404: {"description": "Inexistente, não publicada ou bloqueada."}},
)
def obter(observacao_id: str, connection: DbConnection) -> ObservacaoPublicaResponse:
    return ObservacaoService(connection).obter_publica(observacao_id)
