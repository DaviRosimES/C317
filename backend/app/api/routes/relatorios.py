from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.api.deps import DbConnection
from app.schemas.relatorio import RelatorioPublicoResponse
from app.services.relatorio_service import RelatorioService

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


@router.get("", response_model=list[RelatorioPublicoResponse])
def listar(connection: DbConnection) -> list[RelatorioPublicoResponse]:
    """Relatórios publicados, do mais recente para o mais antigo; lista vazia se não houver."""
    return RelatorioService(connection).listar()


@router.get(
    "/{relatorio_id}/arquivo",
    response_class=FileResponse,
    responses={
        200: {"content": {"application/pdf": {}}, "description": "PDF do relatório."},
        404: {"description": "Relatório inexistente, não publicado ou sem arquivo."},
    },
)
def baixar(relatorio_id: int, connection: DbConnection) -> FileResponse:
    caminho = RelatorioService(connection).arquivo(relatorio_id)
    return FileResponse(caminho, media_type="application/pdf", filename=caminho.name)
