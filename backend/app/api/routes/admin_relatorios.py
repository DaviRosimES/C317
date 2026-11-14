from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse
from pydantic import ValidationError

from app.api.deps import AdminUser, DbConnection
from app.schemas.relatorio import (
    LimitesRelatorioResponse,
    RelatorioAdminResponse,
    RelatorioCreate,
    RelatorioUpdate,
    Situacao,
    StatusRelatorio,
)
from app.services import arquivo_pdf
from app.services.relatorio_service import RelatorioService

_ERRO = {"content": {"application/json": {"example": {"detail": "Mensagem do erro."}}}}
_NAO_ENCONTRADO = {404: {"description": "Relatório não encontrado.", **_ERRO}}
_ARQUIVADO = {409: {"description": "Relatório arquivado: restaure antes da ação.", **_ERRO}}
_UPLOAD = {
    413: {"description": "PDF acima do limite configurado (veja /limites).", **_ERRO},
    422: {"description": "Campos inválidos, arquivo vazio ou conteúdo que não é PDF."},
}
_PDF = "Arquivo PDF; o conteúdo é conferido, não só a extensão."

router = APIRouter(
    prefix="/admin/relatorios",
    tags=["Administração de relatórios"],
    responses={
        401: {"description": "Token ausente, inválido ou expirado.", **_ERRO},
        403: {"description": "Usuário fora da equipe administrativa.", **_ERRO},
    },
)

_CAMPOS_FORMULARIO = {"titulo", "fonte", "numero", "tipo", "data_publicacao", "ano", "mes", "arquivo"}
_Opcional = Annotated[str | None, Form(description="Opcional; vazio conta como não informado.")]


async def _formulario(
    request: Request,
    titulo: Annotated[str, Form()],
    fonte: Annotated[str, Form()],
    numero: _Opcional = None,
    tipo: Annotated[
        str | None, Form(description="`relatorio_tecnico` ou `peca_divulgacao`, quando conhecido.")
    ] = None,
    data_publicacao: Annotated[
        str | None, Form(description="Data original do documento (AAAA-MM-DD), se informada.")
    ] = None,
    ano: _Opcional = None,
    mes: Annotated[str | None, Form(description="1 a 12; exige ano.")] = None,
) -> RelatorioCreate:
    """Metadados do multipart, validados como no JSON. Campos desconhecidos (ex.: um link) são recusados."""
    extras = sorted(set((await request.form()).keys()) - _CAMPOS_FORMULARIO)
    erros = [
        {"type": "extra_forbidden", "loc": ("body", campo), "msg": "Campo não aceito.", "input": None}
        for campo in extras
    ]
    try:
        dados = RelatorioCreate.model_validate(
            {
                "titulo": titulo,
                "fonte": fonte,
                "numero": numero,
                "tipo": tipo,
                "data_publicacao": data_publicacao,
                "ano": ano,
                "mes": mes,
            }
        )
    except ValidationError as erro:
        erros += [{**e, "loc": ("body", *e["loc"])} for e in erro.errors(include_url=False, include_context=False)]
    if erros:
        raise RequestValidationError(erros)
    return dados


@router.get("/limites", response_model=LimitesRelatorioResponse)
def limites(_: AdminUser) -> LimitesRelatorioResponse:
    """Limite de tamanho e formato aceitos, para a interface informar antes do envio."""
    return RelatorioService.limites()


@router.get("", response_model=list[RelatorioAdminResponse])
def listar(
    _: AdminUser,
    connection: DbConnection,
    situacao: Situacao = "ativos",
    status_: Annotated[StatusRelatorio | None, Query(alias="status")] = None,
) -> list[RelatorioAdminResponse]:
    """Relatórios ativos (padrão), arquivados ou todos, em qualquer status."""
    return RelatorioService(connection).listar_admin(situacao, status_)


@router.get("/{relatorio_id}", response_model=RelatorioAdminResponse, responses=_NAO_ENCONTRADO)
def obter(relatorio_id: int, _: AdminUser, connection: DbConnection) -> RelatorioAdminResponse:
    return RelatorioService(connection).obter(relatorio_id)


@router.get(
    "/{relatorio_id}/arquivo",
    response_class=FileResponse,
    responses={200: {"content": {"application/pdf": {}}, "description": "PDF vigente."}, **_NAO_ENCONTRADO},
)
def baixar(relatorio_id: int, _: AdminUser, connection: DbConnection) -> FileResponse:
    """PDF em qualquer situação, para a equipe conferir rascunhos e arquivados."""
    caminho, nome = RelatorioService(connection).arquivo_admin(relatorio_id)
    return FileResponse(caminho, media_type="application/pdf", filename=nome)


@router.post(
    "",
    response_model=RelatorioAdminResponse,
    status_code=status.HTTP_201_CREATED,
    responses=_UPLOAD,
)
def criar(
    _: AdminUser,
    dados: Annotated[RelatorioCreate, Depends(_formulario)],
    arquivo: Annotated[UploadFile, File(description=_PDF)],
    connection: DbConnection,
) -> RelatorioAdminResponse:
    """Cadastra um rascunho (multipart/form-data). Título, fonte e PDF são obrigatórios;
    número, tipo, data e referência só quando conhecidos. Não há campo de URL."""
    return RelatorioService(connection).criar(dados, arquivo.file, arquivo.filename)


@router.patch(
    "/{relatorio_id}",
    response_model=RelatorioAdminResponse,
    responses={**_NAO_ENCONTRADO, **_ARQUIVADO},
)
def corrigir(
    relatorio_id: int, dados: RelatorioUpdate, _: AdminUser, connection: DbConnection
) -> RelatorioAdminResponse:
    """Corrige metadados; o status não muda. Em um publicado, vale na consulta pública na hora."""
    return RelatorioService(connection).corrigir(relatorio_id, dados)


@router.put(
    "/{relatorio_id}/arquivo",
    response_model=RelatorioAdminResponse,
    responses={**_NAO_ENCONTRADO, **_ARQUIVADO, **_UPLOAD},
)
def substituir_arquivo(
    relatorio_id: int,
    arquivo: Annotated[UploadFile, File(description=_PDF)],
    tarefas: BackgroundTasks,
    _: AdminUser,
    connection: DbConnection,
) -> RelatorioAdminResponse:
    """Troca o conteúdo vigente (PDF ou link legado) por um PDF, mantendo o status.
    Se a troca falhar, o conteúdo anterior continua vigente."""
    relatorio, anterior = RelatorioService(connection).substituir_arquivo(
        relatorio_id, arquivo.file, arquivo.filename
    )
    # Tarefas rodam após o envio da resposta, ou seja, depois do commit.
    tarefas.add_task(arquivo_pdf.remover, anterior)
    return relatorio


@router.post(
    "/{relatorio_id}/publicar",
    response_model=RelatorioAdminResponse,
    responses={**_NAO_ENCONTRADO, **_ARQUIVADO, 422: {"description": "Sem fonte ou sem PDF.", **_ERRO}},
)
def publicar(relatorio_id: int, _: AdminUser, connection: DbConnection) -> RelatorioAdminResponse:
    return RelatorioService(connection).publicar(relatorio_id)


@router.post(
    "/{relatorio_id}/despublicar",
    response_model=RelatorioAdminResponse,
    responses={**_NAO_ENCONTRADO, **_ARQUIVADO},
)
def despublicar(relatorio_id: int, _: AdminUser, connection: DbConnection) -> RelatorioAdminResponse:
    """Volta a rascunho sem apagar o conteúdo."""
    return RelatorioService(connection).despublicar(relatorio_id)


@router.post("/{relatorio_id}/arquivar", response_model=RelatorioAdminResponse, responses=_NAO_ENCONTRADO)
def arquivar(relatorio_id: int, _: AdminUser, connection: DbConnection) -> RelatorioAdminResponse:
    """Retira da consulta pública e do download; o status é preservado."""
    return RelatorioService(connection).arquivar(relatorio_id)


@router.post("/{relatorio_id}/restaurar", response_model=RelatorioAdminResponse, responses=_NAO_ENCONTRADO)
def restaurar(relatorio_id: int, _: AdminUser, connection: DbConnection) -> RelatorioAdminResponse:
    """Volta à situação anterior: publicado reaparece; rascunho continua privado."""
    return RelatorioService(connection).restaurar(relatorio_id)
