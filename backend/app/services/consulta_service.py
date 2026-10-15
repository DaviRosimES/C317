from sqlalchemy.engine import Connection

from app.core.errors import ValidacaoError
from app.repositories.catalogo_repository import CatalogoRepository
from app.repositories.indicador_repository import ConsultaPublicaRepository
from app.schemas.consulta import (
    CnaeResponse,
    Escopo,
    IndicadorPublicoResponse,
    Periodicidade,
    PeriodoResponse,
    RotaResponse,
    TipoIndicadorResponse,
)


class ConsultaService:
    def __init__(self, connection: Connection):
        self.catalogo = CatalogoRepository(connection)
        self.consultas = ConsultaPublicaRepository(connection)

    def listar_cnaes(self) -> list[CnaeResponse]:
        return [CnaeResponse.model_validate(linha._mapping) for linha in self.catalogo.listar_cnaes()]

    def listar_tipos(self) -> list[TipoIndicadorResponse]:
        return [
            TipoIndicadorResponse.model_validate(linha._mapping) for linha in self.catalogo.listar_tipos()
        ]

    def listar_rotas(self) -> list[RotaResponse]:
        return [
            RotaResponse(**linha._mapping, composicao_pendente=not linha.cnaes)
            for linha in self.catalogo.listar_rotas()
        ]

    def listar_periodos(self) -> list[PeriodoResponse]:
        return [
            PeriodoResponse.model_validate(linha._mapping) for linha in self.consultas.listar_periodos()
        ]

    def listar_indicadores(
        self,
        tipos: list[str] | None = None,
        cnaes: list[str] | None = None,
        rotas: list[str] | None = None,
        escopo: Escopo | None = None,
        periodicidade: Periodicidade | None = None,
        ano: int | None = None,
        mes: int | None = None,
        inicio: tuple[int, int] | None = None,
        fim: tuple[int, int] | None = None,
    ) -> list[IndicadorPublicoResponse]:
        if mes is not None and ano is None:
            raise ValidacaoError("O filtro de mês exige o ano.")
        if mes is not None and periodicidade == "anual":
            raise ValidacaoError("O filtro de mês não se aplica a referências anuais.")
        if inicio and fim and inicio > fim:
            raise ValidacaoError("O início do intervalo deve ser anterior ou igual ao fim.")
        filtros = {
            "tipos": tipos or None,
            "cnaes": cnaes or None,
            "rotas": rotas or None,
            "escopo": escopo,
            "periodicidade": periodicidade,
            "ano": ano,
            "mes": mes,
            "inicio": inicio[0] * 12 + inicio[1] if inicio else None,
            "fim": fim[0] * 12 + fim[1] if fim else None,
        }
        return [
            IndicadorPublicoResponse.model_validate(linha._mapping)
            for linha in self.consultas.listar_indicadores(filtros)
        ]
