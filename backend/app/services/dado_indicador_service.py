import secrets

from sqlalchemy.engine import Connection, Row
from sqlalchemy.exc import IntegrityError

from app.core.dados import (
    TERRITORIO_SANTA_RITA,
    chave_periodo,
    problemas_compatibilidade,
    problemas_referencia,
    rotulo_periodo,
)
from app.core.errors import ConflitoError, NaoEncontradoError, ValidacaoError
from app.repositories.dado_indicador_repository import DadoIndicadorRepository
from app.schemas.dado_indicador import (
    DadoAdminResponse,
    DadoCreate,
    DadoUpdate,
    Referencia,
)

DUPLICADO = (
    "Já existe um dado para este indicador, categoria, referência e fonte. "
    "Consulte o dado existente para fazer a correção."
)
_UNICOS_NO_ANO = {"anual", "mensal", "retrato"}


def referencia(linha) -> dict:
    """Referência estruturada com a chave do Ano/Período e o rótulo derivado."""
    campos = (linha.referencia_tipo, linha.ano_inicio, linha.ano_fim, linha.mes, linha.data_extracao)
    return {
        "tipo": linha.referencia_tipo,
        "ano_inicio": linha.ano_inicio,
        "ano_fim": linha.ano_fim,
        "mes": linha.mes,
        "data_extracao": linha.data_extracao,
        "chave": chave_periodo(*campos),
        "rotulo": rotulo_periodo(*campos),
    }


def montar_dado(linha: Row) -> dict:
    """Linha de SELECT_DADO no formato aninhado das respostas (administração e público)."""
    return {
        "id": linha.id,
        "indicador": {
            "codigo": linha.indicador_codigo, "nome": linha.indicador_nome, "arquivado": linha.indicador_arquivado,
        },
        "unidade": {
            "codigo": linha.unidade_codigo, "nome": linha.unidade_nome, "inteira": linha.inteira,
            "maximo": linha.maximo, "casas_exibicao": linha.casas_exibicao,
        },
        "territorio": {"codigo": linha.territorio_codigo, "nome": linha.territorio_nome},
        "categoria": None
        if linha.categoria_codigo is None
        else {
            "codigo": linha.categoria_codigo, "nome": linha.categoria_nome,
            "classificacao_codigo": linha.classificacao_codigo, "classificacao_nome": linha.classificacao_nome,
            "codigo_cnae": linha.codigo_cnae,
        },
        "fonte": {"codigo": linha.fonte_codigo, "nome": linha.fonte_nome, "links": linha.fonte_links},
        "referencia": referencia(linha),
        "valor": linha.valor,
        "qualificador": linha.qualificador,
        "notas": linha.notas,
        "origens": linha.origens,
        "status": linha.status,
        "arquivado": linha.arquivado,
        "divulgacao_bloqueada": linha.divulgacao_bloqueada,
        "motivo_bloqueio": linha.motivo_bloqueio,
        "demonstracao": linha.demonstracao,
        "visivel_publicamente": linha.visivel_publicamente,
    }


class DadoIndicadorService:
    def __init__(self, connection: Connection):
        self.connection = connection
        self.repo = DadoIndicadorRepository(connection)

    # Consulta administrativa

    def listar(self, indicador: str | None, situacao: str, status: str | None) -> list[DadoAdminResponse]:
        if indicador and self.repo.regras(indicador) is None:
            raise ValidacaoError("Indicador desconhecido.")
        return [DadoAdminResponse.model_validate(montar_dado(linha)) for linha in self.repo.listar(indicador, situacao, status)]

    def obter(self, dado_id: str) -> DadoAdminResponse:
        linha = self.repo.get(dado_id)
        if linha is None:
            raise NaoEncontradoError("Dado não encontrado.")
        return DadoAdminResponse.model_validate(montar_dado(linha))

    # Cadastro e correção

    def criar(self, dados: DadoCreate) -> DadoAdminResponse:
        """Novo dado em rascunho, em Santa Rita do Sapucaí, com id estável gerado pelo sistema."""
        campos = {
            "id": secrets.token_hex(32),
            "indicador_codigo": dados.indicador_codigo,
            "territorio_codigo": TERRITORIO_SANTA_RITA,
            "categoria_codigo": dados.categoria_codigo,
            "fonte_codigo": dados.fonte_codigo,
            **self._referencia(dados.referencia),
            "valor": dados.valor,
            "qualificador": dados.qualificador,
            "notas": dados.notas,
        }
        self._validar(campos, "cadastrar dados")
        self._gravar(self.repo.inserir, campos)
        return self.obter(campos["id"])

    def corrigir(self, dado_id: str, dados: DadoUpdate) -> DadoAdminResponse:
        """Corrige valor, fonte, categoria, referência, qualificador ou notas mantendo o id.

        Um publicado corrigido vale na consulta pública imediatamente; rascunho continua privado.
        """
        atual = self._ativo(dado_id, "editá-lo")
        campos = {**atual._mapping, "territorio_codigo": TERRITORIO_SANTA_RITA}
        alteracoes = dados.model_dump(exclude_unset=True)
        if "referencia" in alteracoes:
            campos.update(self._referencia(dados.referencia))
            del alteracoes["referencia"]
        campos.update(alteracoes)
        self._validar(campos, "editar seus dados")
        self._gravar(self.repo.atualizar, campos)
        return self.obter(dado_id)

    # Estados

    def publicar(self, dado_id: str) -> DadoAdminResponse:
        atual = self._ativo(dado_id, "publicá-lo")
        self._indicador_ativo(atual.indicador_codigo, "publicar dados")
        if atual.divulgacao_bloqueada:
            raise ConflitoError("A divulgação deste dado está bloqueada. Desbloqueie-o antes de publicar.")
        self.repo.definir(dado_id, status="publicado")
        return self.obter(dado_id)

    def despublicar(self, dado_id: str) -> DadoAdminResponse:
        """Volta a rascunho sem apagar o conteúdo."""
        self._ativo(dado_id, "despublicá-lo")
        self.repo.definir(dado_id, status="rascunho")
        return self.obter(dado_id)

    def arquivar(self, dado_id: str) -> DadoAdminResponse:
        """Retira da consulta preservando status e bloqueio."""
        self._existente(dado_id)
        self.repo.definir(dado_id, arquivado=True)
        return self.obter(dado_id)

    def restaurar(self, dado_id: str) -> DadoAdminResponse:
        """Volta à situação anterior; o bloqueio continua até ser removido explicitamente."""
        self._existente(dado_id)
        self.repo.definir(dado_id, arquivado=False)
        return self.obter(dado_id)

    def bloquear(self, dado_id: str, motivo: str) -> DadoAdminResponse:
        """Impede a divulgação com um motivo concreto; o status guardado não muda."""
        self._ativo(dado_id, "bloqueá-lo")
        self.repo.definir(dado_id, divulgacao_bloqueada=True, motivo_bloqueio=motivo)
        return self.obter(dado_id)

    def desbloquear(self, dado_id: str) -> DadoAdminResponse:
        self._ativo(dado_id, "desbloqueá-lo")
        self.repo.definir(dado_id, divulgacao_bloqueada=False, motivo_bloqueio=None)
        return self.obter(dado_id)

    # Auxiliares

    def _existente(self, dado_id: str) -> Row:
        atual = self.repo.campos(dado_id)
        if atual is None:
            raise NaoEncontradoError("Dado não encontrado.")
        return atual

    def _ativo(self, dado_id: str, acao: str) -> Row:
        atual = self._existente(dado_id)
        if atual.arquivado:
            raise ConflitoError(f"Dado arquivado. Restaure-o antes de {acao}.")
        return atual

    def _indicador_ativo(self, indicador: str, acao: str) -> Row:
        regras = self.repo.regras(indicador)
        if regras is None:
            raise ValidacaoError("Indicador desconhecido.")
        if regras.arquivado:
            raise ConflitoError(f"O indicador está arquivado. Restaure-o antes de {acao}.")
        return regras

    @staticmethod
    def _referencia(referencia: Referencia) -> dict:
        ano_fim = referencia.ano_fim
        if ano_fim is None and referencia.tipo in _UNICOS_NO_ANO:
            ano_fim = referencia.ano_inicio
        return {
            "referencia_tipo": referencia.tipo,
            "ano_inicio": referencia.ano_inicio,
            "ano_fim": ano_fim,
            "mes": referencia.mes,
            "data_extracao": referencia.data_extracao,
        }

    def _validar(self, campos: dict, acao: str) -> None:
        regras = self._indicador_ativo(campos["indicador_codigo"], acao)
        if not self.repo.fonte_existe(campos["fonte_codigo"]):
            raise ValidacaoError("Fonte desconhecida.")
        classificacao = None
        if campos["categoria_codigo"] is not None:
            classificacao = self.repo.classificacao_da_categoria(campos["categoria_codigo"])
            if classificacao is None:
                raise ValidacaoError("Categoria desconhecida.")
        problemas = problemas_referencia(
            {
                "tipo": campos["referencia_tipo"],
                "ano_inicio": campos["ano_inicio"],
                "ano_fim": campos["ano_fim"],
                "mes": campos["mes"],
                "data_extracao": campos["data_extracao"],
            }
        )
        problemas += problemas_compatibilidade(
            valor=campos["valor"],
            referencia_tipo=campos["referencia_tipo"],
            categoria_classificacao=classificacao,
            sem_categoria=campos["categoria_codigo"] is None,
            indicador=regras._mapping,
            unidade={"nome": regras.unidade_nome, "inteira": regras.inteira, "maximo": regras.maximo},
        )
        if problemas:
            raise ValidacaoError(" ".join(problemas))
        if (outro := self.repo.mesma_identidade(campos)) is not None:
            raise ConflitoError(f"{DUPLICADO} (dado {outro})")

    def _gravar(self, operacao, campos: dict) -> None:
        try:
            with self.connection.begin_nested():
                operacao(campos)
        except IntegrityError as erro:
            # Gravação concorrente da mesma combinação, depois da conferência.
            if "uq_dados_indicadores_identidade" in str(erro.orig):
                raise ConflitoError(DUPLICADO) from erro
            raise
