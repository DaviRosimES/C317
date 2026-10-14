from collections.abc import Callable
from decimal import Decimal

from sqlalchemy.engine import Connection
from sqlalchemy.exc import IntegrityError

from app.core.errors import ConflitoError, NaoEncontradoError, ValidacaoError
from app.repositories.catalogo_repository import CatalogoRepository
from app.repositories.indicador_repository import IndicadorRepository
from app.schemas.indicador import (
    IndicadorCreate,
    IndicadorResponse,
    IndicadorUpdate,
    StatusLancamento,
)

# Índices parciais da migração 6e2c3170b001: um agregado por tipo, período e CNAE.
_INDICES_UNICOS = {"uq_indicadores_municipais", "uq_indicadores_cnae"}


class IndicadorService:
    def __init__(self, connection: Connection):
        self.connection = connection
        self.indicadores = IndicadorRepository(connection)
        self.catalogo = CatalogoRepository(connection)

    def listar(self, status: StatusLancamento | None = None) -> list[IndicadorResponse]:
        return [_resposta(linha) for linha in self.indicadores.listar(status)]

    def obter(self, indicador_id: int) -> IndicadorResponse:
        linha = self.indicadores.get(indicador_id)
        if linha is None:
            raise NaoEncontradoError("Lançamento não encontrado.")
        return _resposta(linha)

    def criar(self, dados: IndicadorCreate) -> IndicadorResponse:
        registro = self._validar(dados.model_dump())
        indicador_id = self._gravar(lambda: self.indicadores.inserir(registro))
        return self.obter(indicador_id)

    def atualizar(
        self, indicador_id: int, dados: IndicadorUpdate, admin_id: int
    ) -> IndicadorResponse:
        atual = self.obter(indicador_id)
        campos = atual.model_dump(include=set(IndicadorCreate.model_fields))
        campos.update(dados.model_dump(exclude_unset=True))
        registro = self._validar(campos)
        # Um valor já público passa a ter como responsável quem o corrigiu.
        validado_por = admin_id if atual.status == "publicado" else None
        self._gravar(lambda: self.indicadores.atualizar(indicador_id, registro, validado_por))
        return self.obter(indicador_id)

    def publicar(self, indicador_id: int, admin_id: int) -> IndicadorResponse:
        self.obter(indicador_id)
        self.indicadores.publicar(indicador_id, admin_id)
        return self.obter(indicador_id)

    def _validar(self, campos: dict) -> dict:
        """Aplica as regras que o banco não verifica e devolve as colunas a gravar."""
        tipo = self.catalogo.get_tipo(campos["tipo"])
        if tipo is None:
            raise ValidacaoError(f"Tipo de indicador inexistente: {campos['tipo']}.")

        codigo_cnae = campos.get("codigo_cnae")
        estabelecimento_id = campos.get("estabelecimento_id")
        if tipo.escopo == "municipal" and (codigo_cnae or estabelecimento_id):
            raise ValidacaoError(
                "Indicadores municipais não recebem CNAE nem estabelecimento."
            )
        if tipo.escopo == "cnae" and (not codigo_cnae or estabelecimento_id):
            raise ValidacaoError(
                "Indicadores por CNAE exigem o código CNAE e não recebem estabelecimento."
            )
        if tipo.escopo == "estabelecimento" and (not estabelecimento_id or codigo_cnae):
            raise ValidacaoError(
                "Indicadores por estabelecimento exigem o estabelecimento e não recebem CNAE."
            )

        setor_id = None
        if codigo_cnae:
            setor_id = self.catalogo.get_setor_id(codigo_cnae)
            if setor_id is None:
                raise ValidacaoError(f"CNAE não cadastrado no catálogo: {codigo_cnae}.")
        if estabelecimento_id and not self.catalogo.estabelecimento_existe(estabelecimento_id):
            raise ValidacaoError(f"Estabelecimento inexistente: {estabelecimento_id}.")

        return {
            "tipo": tipo.codigo,
            "valor": _validar_valor(campos["valor"], tipo.unidade),
            "periodo_id": self.indicadores.obter_periodo(campos["ano"], campos.get("mes")),
            "origem": campos["fonte"],
            "setor_id": setor_id,
            "estabelecimento_id": estabelecimento_id,
            "demonstracao": campos["demonstracao"],
        }

    def _gravar(self, operacao: Callable[[], int | None]) -> int | None:
        # O savepoint mantém a transação da requisição utilizável após a violação.
        try:
            with self.connection.begin_nested():
                return operacao()
        except IntegrityError as erro:
            if getattr(erro.orig.diag, "constraint_name", None) in _INDICES_UNICOS:
                raise ConflitoError(
                    "Já existe um lançamento deste tipo para o mesmo período e CNAE. "
                    "Corrija o lançamento existente em vez de criar outro."
                ) from erro
            raise


def _validar_valor(valor: Decimal, unidade: str) -> Decimal:
    if unidade == "quantidade":
        if valor < 0 or valor != valor.to_integral_value():
            raise ValidacaoError("Quantidades devem ser números inteiros e não negativos.")
        return valor.to_integral_value()
    if unidade == "percentual" and not 0 <= valor <= 100:
        raise ValidacaoError("Percentuais devem estar entre 0 e 100.")
    return valor


def _resposta(linha) -> IndicadorResponse:
    return IndicadorResponse.model_validate(linha._mapping)
