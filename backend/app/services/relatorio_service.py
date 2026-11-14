from pathlib import Path
from typing import BinaryIO

from sqlalchemy.engine import Connection, Row

from app.core.config import settings
from app.core.errors import ConflitoError, NaoEncontradoError, ValidacaoError
from app.repositories.relatorio_repository import RelatorioRepository
from app.schemas.relatorio import (
    LimitesRelatorioResponse,
    RelatorioAdminResponse,
    RelatorioCreate,
    RelatorioPublicoResponse,
    RelatorioUpdate,
)
from app.services import arquivo_pdf

_METADADOS = ("titulo", "numero", "tipo", "fonte", "data_publicacao", "ano", "mes")


class RelatorioService:
    def __init__(self, connection: Connection):
        self.connection = connection
        self.relatorios = RelatorioRepository(connection)

    # Consulta pública: somente publicados e não arquivados

    def listar(self) -> list[RelatorioPublicoResponse]:
        return [
            RelatorioPublicoResponse.model_validate(linha._mapping)
            for linha in self.relatorios.listar_publicados()
        ]

    def obter_publico(self, relatorio_id: int) -> RelatorioPublicoResponse:
        relatorio = self.relatorios.get_publicado(relatorio_id)
        if relatorio is None:
            raise NaoEncontradoError("Relatório não encontrado.")
        return RelatorioPublicoResponse.model_validate(relatorio._mapping)

    def arquivo(self, relatorio_id: int) -> tuple[Path, str]:
        """PDF de um relatório publicado e não arquivado, com o nome para download."""
        relatorio = self.relatorios.get_publicado(relatorio_id)
        if relatorio is None:
            raise NaoEncontradoError("Relatório não encontrado.")
        return self._pdf(relatorio)

    # Administração

    def listar_admin(self, situacao: str, status: str | None) -> list[RelatorioAdminResponse]:
        return [self._admin(linha) for linha in self.relatorios.listar(situacao, status)]

    def obter(self, relatorio_id: int) -> RelatorioAdminResponse:
        return self._admin(self._get(relatorio_id))

    def arquivo_admin(self, relatorio_id: int) -> tuple[Path, str]:
        """PDF em qualquer situação (rascunho, publicado ou arquivado), para a equipe conferir."""
        return self._pdf(self._get(relatorio_id))

    @staticmethod
    def limites() -> LimitesRelatorioResponse:
        return LimitesRelatorioResponse(
            tamanho_maximo_bytes=settings.relatorios_tamanho_maximo,
            tipos_aceitos=["application/pdf"],
        )

    def criar(self, dados: RelatorioCreate, arquivo: BinaryIO, nome: str | None) -> RelatorioAdminResponse:
        """Novo relatório sempre em rascunho, com PDF obrigatório."""
        arquivo_url = arquivo_pdf.salvar(arquivo)
        try:
            with self.connection.begin_nested():
                relatorio_id = self.relatorios.inserir(
                    {
                        **self._campos(dados.model_dump()),
                        "arquivo_url": arquivo_url,
                        "arquivo_nome": arquivo_pdf.nome_original(nome),
                    }
                )
        except BaseException:
            arquivo_pdf.remover(arquivo_url)
            raise
        return self.obter(relatorio_id)

    def corrigir(self, relatorio_id: int, dados: RelatorioUpdate) -> RelatorioAdminResponse:
        """Edição confirmada de um publicado entra em vigor na hora; rascunho continua privado."""
        atual = self._editavel(relatorio_id, "editá-lo")
        campos = {campo: getattr(atual, campo) for campo in _METADADOS}
        campos.update(dados.model_dump(exclude_unset=True))
        if campos["mes"] is not None and campos["ano"] is None:
            raise ValidacaoError("Mês de referência exige ano.")
        if campos["fonte"] is None:
            raise ValidacaoError("Informe a fonte do relatório.")
        with self.connection.begin_nested():
            self.relatorios.atualizar_metadados(relatorio_id, self._campos(campos))
        return self.obter(relatorio_id)

    def substituir_arquivo(
        self, relatorio_id: int, arquivo: BinaryIO, nome: str | None
    ) -> tuple[RelatorioAdminResponse, str | None]:
        """Troca o conteúdo vigente por um PDF, mantendo o status.

        Devolve também o PDF anterior, que só deve ser apagado depois da confirmação da
        transação: se algo falhar antes disso, ele continua sendo o conteúdo vigente.
        """
        atual = self._editavel(relatorio_id, "trocar o PDF")
        arquivo_url = arquivo_pdf.salvar(arquivo)
        try:
            with self.connection.begin_nested():
                self.relatorios.substituir_arquivo(
                    relatorio_id, arquivo_url, arquivo_pdf.nome_original(nome)
                )
        except BaseException:
            arquivo_pdf.remover(arquivo_url)
            raise
        return self.obter(relatorio_id), atual.arquivo_url

    def publicar(self, relatorio_id: int) -> RelatorioAdminResponse:
        atual = self._editavel(relatorio_id, "publicá-lo")
        if atual.fonte is None:
            raise ValidacaoError("Informe a fonte antes de publicar o relatório.")
        if atual.possui_pdf and arquivo_pdf.resolver(atual.arquivo_url) is None:
            raise ValidacaoError(
                "O PDF deste relatório não foi encontrado no servidor. Envie o arquivo novamente "
                "antes de publicar."
            )
        self.relatorios.definir_status(relatorio_id, "publicado")
        return self.obter(relatorio_id)

    def despublicar(self, relatorio_id: int) -> RelatorioAdminResponse:
        """Volta a rascunho sem apagar o conteúdo."""
        self._editavel(relatorio_id, "despublicá-lo")
        self.relatorios.definir_status(relatorio_id, "rascunho")
        return self.obter(relatorio_id)

    def arquivar(self, relatorio_id: int) -> RelatorioAdminResponse:
        """Retira da consulta pública e preserva o status para a restauração."""
        self._get(relatorio_id)
        self.relatorios.definir_arquivado(relatorio_id, True)
        return self.obter(relatorio_id)

    def restaurar(self, relatorio_id: int) -> RelatorioAdminResponse:
        self._get(relatorio_id)
        self.relatorios.definir_arquivado(relatorio_id, False)
        return self.obter(relatorio_id)

    # Auxiliares

    def _get(self, relatorio_id: int) -> Row:
        relatorio = self.relatorios.get(relatorio_id)
        if relatorio is None:
            raise NaoEncontradoError("Relatório não encontrado.")
        return relatorio

    def _editavel(self, relatorio_id: int, acao: str) -> Row:
        relatorio = self._get(relatorio_id)
        if relatorio.arquivado:
            raise ConflitoError(f"Relatório arquivado. Restaure-o antes de {acao}.")
        return relatorio

    def _campos(self, dados: dict) -> dict:
        campos = {campo: dados.get(campo) for campo in _METADADOS if campo not in {"ano", "mes"}}
        campos["periodo_id"] = self.relatorios.periodo(dados.get("ano"), dados.get("mes"))
        return campos

    @staticmethod
    def _admin(linha: Row) -> RelatorioAdminResponse:
        return RelatorioAdminResponse.model_validate(linha._mapping)

    @staticmethod
    def _pdf(relatorio: Row) -> tuple[Path, str]:
        if relatorio.arquivo_url is None:
            raise NaoEncontradoError(
                "Este relatório não tem PDF na API; acesse-o pelo link externo informado."
            )
        caminho = arquivo_pdf.resolver(relatorio.arquivo_url)
        if caminho is None:
            raise NaoEncontradoError("Arquivo do relatório não encontrado.")
        return caminho, relatorio.arquivo_nome or caminho.name
