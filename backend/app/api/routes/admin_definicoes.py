from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, DbConnection
from app.schemas.definicao import (
    CatalogosResponse,
    CategoriaCreate,
    CategoriaResponse,
    CategoriaUpdate,
    ClassificacaoCreate,
    ClassificacaoResponse,
    ClassificacaoUpdate,
    DefinicaoCreate,
    DefinicaoResponse,
    DefinicaoUpdate,
    FonteCreate,
    FonteResponse,
    FonteUpdate,
    Situacao,
)
from app.services.definicao_service import DefinicaoService

_ERRO = {"content": {"application/json": {"example": {"detail": "Mensagem do erro."}}}}
_AUTENTICACAO = {
    401: {"description": "Token ausente, inválido ou expirado.", **_ERRO},
    403: {"description": "Usuário fora da equipe administrativa.", **_ERRO},
}
_NAO_ENCONTRADO = {404: {"description": "Item não encontrado.", **_ERRO}}
_CONFLITO = {409: {"description": "Nome duplicado ou alteração que invalidaria dados existentes.", **_ERRO}}
_VALIDACAO = {422: {"description": "Campos inválidos ou código de catálogo desconhecido."}}

definicoes = APIRouter(
    prefix="/admin/definicoes-indicadores", tags=["Administração de indicadores"], responses=_AUTENTICACAO
)
catalogos = APIRouter(prefix="/admin/catalogos", tags=["Administração de catálogos"], responses=_AUTENTICACAO)


@definicoes.get("", response_model=list[DefinicaoResponse])
def listar(
    _: AdminUser,
    connection: DbConnection,
    situacao: Situacao = "ativos",
    setor: Annotated[str | None, Query(description="Código do Setor do Observatório.")] = None,
    busca: Annotated[str | None, Query(max_length=200, description="Trecho do nome.")] = None,
) -> list[DefinicaoResponse]:
    """Definições ativas (padrão), arquivadas ou todas."""
    return DefinicaoService(connection).listar(situacao, setor, busca)


@definicoes.get("/{codigo}", response_model=DefinicaoResponse, responses=_NAO_ENCONTRADO)
def obter(codigo: str, _: AdminUser, connection: DbConnection) -> DefinicaoResponse:
    return DefinicaoService(connection).obter(codigo)


@definicoes.post(
    "",
    response_model=DefinicaoResponse,
    status_code=status.HTTP_201_CREATED,
    responses={**_CONFLITO, **_VALIDACAO},
)
def criar(dados: DefinicaoCreate, _: AdminUser, connection: DbConnection) -> DefinicaoResponse:
    """Cadastra uma definição ativa; o código é gerado pelo sistema a partir do nome."""
    return DefinicaoService(connection).criar(dados)


@definicoes.patch(
    "/{codigo}",
    response_model=DefinicaoResponse,
    responses={**_NAO_ENCONTRADO, **_CONFLITO, **_VALIDACAO},
)
def corrigir(codigo: str, dados: DefinicaoUpdate, _: AdminUser, connection: DbConnection) -> DefinicaoResponse:
    """Corrige a definição. Renomear preserva o código. Recusa (409) o que invalidaria dados
    existentes, inclusive arquivados, e qualquer edição de indicador arquivado."""
    return DefinicaoService(connection).corrigir(codigo, dados)


@definicoes.post("/{codigo}/arquivar", response_model=DefinicaoResponse, responses=_NAO_ENCONTRADO)
def arquivar(codigo: str, _: AdminUser, connection: DbConnection) -> DefinicaoResponse:
    """Oculta o indicador e seus dados sem alterar o estado individual de cada dado."""
    return DefinicaoService(connection).arquivar(codigo)


@definicoes.post("/{codigo}/restaurar", response_model=DefinicaoResponse, responses=_NAO_ENCONTRADO)
def restaurar(codigo: str, _: AdminUser, connection: DbConnection) -> DefinicaoResponse:
    """Volta à situação anterior; dados arquivados ou em rascunho continuam como estavam."""
    return DefinicaoService(connection).restaurar(codigo)


@catalogos.get("", response_model=CatalogosResponse)
def listar_catalogos(_: AdminUser, connection: DbConnection) -> CatalogosResponse:
    """Setores e unidades (somente leitura), fontes, classificações e categorias, com `em_uso`."""
    return DefinicaoService(connection).catalogos()


@catalogos.post(
    "/fontes", response_model=FonteResponse, status_code=status.HTTP_201_CREATED, responses={**_CONFLITO, **_VALIDACAO}
)
def criar_fonte(dados: FonteCreate, _: AdminUser, connection: DbConnection) -> FonteResponse:
    return DefinicaoService(connection).criar_fonte(dados)


@catalogos.patch(
    "/fontes/{codigo}", response_model=FonteResponse, responses={**_NAO_ENCONTRADO, **_CONFLITO, **_VALIDACAO}
)
def corrigir_fonte(codigo: str, dados: FonteUpdate, _: AdminUser, connection: DbConnection) -> FonteResponse:
    return DefinicaoService(connection).corrigir_fonte(codigo, dados)


@catalogos.post(
    "/classificacoes",
    response_model=ClassificacaoResponse,
    status_code=status.HTTP_201_CREATED,
    responses={**_CONFLITO, **_VALIDACAO},
)
def criar_classificacao(dados: ClassificacaoCreate, _: AdminUser, connection: DbConnection) -> ClassificacaoResponse:
    return DefinicaoService(connection).criar_classificacao(dados)


@catalogos.patch(
    "/classificacoes/{codigo}",
    response_model=ClassificacaoResponse,
    responses={**_NAO_ENCONTRADO, **_CONFLITO, **_VALIDACAO},
)
def corrigir_classificacao(
    codigo: str, dados: ClassificacaoUpdate, _: AdminUser, connection: DbConnection
) -> ClassificacaoResponse:
    return DefinicaoService(connection).corrigir_classificacao(codigo, dados)


@catalogos.post(
    "/categorias",
    response_model=CategoriaResponse,
    status_code=status.HTTP_201_CREATED,
    responses={**_CONFLITO, **_VALIDACAO},
)
def criar_categoria(dados: CategoriaCreate, _: AdminUser, connection: DbConnection) -> CategoriaResponse:
    return DefinicaoService(connection).criar_categoria(dados)


@catalogos.patch(
    "/categorias/{codigo}",
    response_model=CategoriaResponse,
    responses={**_NAO_ENCONTRADO, **_CONFLITO, **_VALIDACAO},
)
def corrigir_categoria(codigo: str, dados: CategoriaUpdate, _: AdminUser, connection: DbConnection) -> CategoriaResponse:
    """Nome é descritivo; classificação e CNAE só mudam enquanto a categoria não é usada por dados."""
    return DefinicaoService(connection).corrigir_categoria(codigo, dados)
