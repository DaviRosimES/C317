from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.api.deps import DbConnection
from app.schemas.relatorio import RelatorioPublicoResponse
from app.services.relatorio_service import RelatorioService

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])

_NAO_PUBLICO = "Relatório inexistente, em rascunho ou arquivado."


@router.get("", response_model=list[RelatorioPublicoResponse])
def listar(connection: DbConnection) -> list[RelatorioPublicoResponse]:
    """Relatórios publicados e não arquivados, do mais recente para o mais antigo.

    Os sem data de publicação conhecida ficam no fim. `link_externo` indica um documento
    acessado fora da API; nesse caso não há PDF em /relatorios/{id}/arquivo.
    """
    return RelatorioService(connection).listar()


@router.get(
    "/{relatorio_id}",
    response_model=RelatorioPublicoResponse,
    responses={404: {"description": _NAO_PUBLICO}},
)
def obter(relatorio_id: int, connection: DbConnection) -> RelatorioPublicoResponse:
    return RelatorioService(connection).obter_publico(relatorio_id)


@router.get(
    "/{relatorio_id}/arquivo",
    response_class=FileResponse,
    responses={
        200: {"content": {"application/pdf": {}}, "description": "PDF do relatório."},
        404: {"description": f"{_NAO_PUBLICO} Também quando só há link externo ou falta o arquivo."},
    },
)
def baixar(relatorio_id: int, connection: DbConnection) -> FileResponse:
    caminho, nome = RelatorioService(connection).arquivo(relatorio_id)
    return FileResponse(caminho, media_type="application/pdf", filename=nome)
