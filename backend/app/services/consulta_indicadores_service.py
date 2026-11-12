from itertools import groupby

from sqlalchemy.engine import Connection

from app.core.dados import chave_periodo, ler_chave_periodo, ordem_periodo, rotulo_periodo
from app.core.errors import NaoEncontradoError, ValidacaoError
from app.repositories.consulta_indicadores_repository import ConsultaIndicadoresRepository
from app.schemas.consulta_indicadores import (
    ConsultaResponse,
    DadoPublico,
    DadoPublicoDetalhe,
    FontePublica,
    IndicadorConsulta,
    OpcoesConsultaResponse,
    PeriodoOpcao,
)
from app.schemas.dado_indicador import CodigoNome
from app.services.dado_indicador_service import montar_dado


def _periodo(tipo: str, ano_inicio: int, ano_fim: int, mes, data_extracao) -> PeriodoOpcao:
    campos = (tipo, ano_inicio, ano_fim, mes, data_extracao)
    return PeriodoOpcao(
        chave=chave_periodo(*campos),
        rotulo=rotulo_periodo(*campos),
        tipo=tipo,
        ano_inicio=ano_inicio,
        ano_fim=ano_fim,
        mes=mes,
        data_extracao=data_extracao,
    )


class ConsultaIndicadoresService:
    """Consulta global: Setor e Ano/Período selecionam os indicadores com dados elegíveis.

    A elegibilidade (publicado, não arquivado, não bloqueado, indicador ativo, Santa Rita do
    Sapucaí) vale igualmente para opções, lista, detalhe, acesso por id e fontes.
    """

    def __init__(self, connection: Connection):
        self.repo = ConsultaIndicadoresRepository(connection)

    def opcoes(self, setor: str | None) -> OpcoesConsultaResponse:
        self._setor(setor)
        periodos = sorted(
            (tuple(linha) for linha in self.repo.periodos_disponiveis(setor)), key=lambda p: ordem_periodo(*p)
        )
        return OpcoesConsultaResponse(
            setores=[CodigoNome(codigo=s.codigo, nome=s.nome) for s in self.repo.setores_disponiveis()],
            periodos=[_periodo(*p) for p in periodos],
        )

    def consultar(self, setor: str | None, periodo: str | None) -> ConsultaResponse:
        setor_escolhido = self._setor(setor)
        filtro_periodo = self._periodo(periodo)
        return ConsultaResponse(
            setor=setor_escolhido,
            periodo=_periodo(*filtro_periodo.values()) if filtro_periodo else None,
            indicadores=self._indicadores(setor, filtro_periodo),
        )

    def indicador(self, codigo: str, setor: str | None, periodo: str | None) -> IndicadorConsulta:
        """Detalhe com os mesmos filtros globais; 404 se o indicador não tem dado elegível nessa seleção."""
        self._setor(setor)
        indicadores = self._indicadores(setor, self._periodo(periodo), codigo)
        if not indicadores:
            raise NaoEncontradoError("Indicador sem dados publicados para esta seleção.")
        return indicadores[0]

    def dado(self, dado_id: str) -> DadoPublicoDetalhe:
        linha = self.repo.dado(dado_id)
        if linha is None:
            raise NaoEncontradoError("Dado não encontrado.")
        return DadoPublicoDetalhe.model_validate(montar_dado(linha))

    def fontes(self) -> list[FontePublica]:
        return [FontePublica.model_validate(linha._mapping) for linha in self.repo.fontes()]

    def _indicadores(self, setor: str | None, periodo: dict | None, codigo: str | None = None) -> list[IndicadorConsulta]:
        linhas = self.repo.dados(setor, periodo, codigo)
        por_indicador = {
            chave: [DadoPublico.model_validate(montar_dado(linha)) for linha in grupo]
            for chave, grupo in groupby(linhas, key=lambda linha: linha.indicador_codigo)
        }
        return [
            IndicadorConsulta.model_validate({**definicao._mapping, "dados": por_indicador[definicao.codigo]})
            for definicao in self.repo.definicoes(list(por_indicador))
        ]

    def _setor(self, setor: str | None) -> CodigoNome | None:
        if setor is None:
            return None
        encontrado = self.repo.setor(setor)
        if encontrado is None:
            raise ValidacaoError("Setor desconhecido.")
        return CodigoNome(codigo=encontrado.codigo, nome=encontrado.nome)

    @staticmethod
    def _periodo(periodo: str | None) -> dict | None:
        if periodo is None:
            return None
        try:
            return ler_chave_periodo(periodo)
        except ValueError as erro:
            raise ValidacaoError(str(erro)) from erro
