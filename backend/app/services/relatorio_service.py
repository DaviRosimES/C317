from pathlib import Path

from sqlalchemy.engine import Connection

from app.core.config import settings
from app.core.errors import NaoEncontradoError
from app.repositories.relatorio_repository import RelatorioRepository
from app.schemas.relatorio import RelatorioPublicoResponse


class RelatorioService:
    def __init__(self, connection: Connection):
        self.relatorios = RelatorioRepository(connection)

    def listar(self) -> list[RelatorioPublicoResponse]:
        return [
            RelatorioPublicoResponse.model_validate(linha._mapping)
            for linha in self.relatorios.listar_publicados()
        ]

    def arquivo(self, relatorio_id: int) -> Path:
        """Caminho do PDF de um relatório publicado, sempre dentro da pasta configurada."""
        relatorio = self.relatorios.get_publicado(relatorio_id)
        if relatorio is None:
            raise NaoEncontradoError("Relatório não encontrado.")
        pasta = settings.relatorios_dir.resolve()
        caminho = (pasta / relatorio.arquivo_url).resolve()
        if (
            not caminho.is_relative_to(pasta)
            or caminho.suffix.lower() != ".pdf"
            or not caminho.is_file()
        ):
            raise NaoEncontradoError("Arquivo do relatório não encontrado.")
        return caminho
