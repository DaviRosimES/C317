from sqlalchemy import text
from sqlalchemy.engine import Connection, Row

from app.core.dados import TERRITORIO_SANTA_RITA
from app.repositories.dado_indicador_repository import ELEGIVEL, ORDEM_DADOS, SELECT_DADO

_NO_SETOR = (
    "EXISTS(SELECT 1 FROM indicador_setores x WHERE x.indicador_codigo = d.indicador_codigo "
    "AND x.setor_codigo = :setor)"
)
# Referência completa: 2024 anual não inclui acumulados que terminam em 2024.
_NO_PERIODO = (
    "d.referencia_tipo = :tipo AND d.ano_inicio = :ano_inicio AND d.ano_fim = :ano_fim "
    "AND d.mes IS NOT DISTINCT FROM CAST(:mes AS integer) "
    "AND d.data_extracao IS NOT DISTINCT FROM CAST(:data_extracao AS date)"
)
_DADOS = """
    FROM dados_indicadores d JOIN indicadores_definicoes i ON i.codigo = d.indicador_codigo
"""


class ConsultaIndicadoresRepository:
    """Leitura pública: somente dados elegíveis (ELEGIVEL) de Santa Rita do Sapucaí."""

    def __init__(self, connection: Connection):
        self.connection = connection

    def _executar(self, sql: str, parametros: dict | None = None):
        return self.connection.execute(text(sql), {"santa_rita": TERRITORIO_SANTA_RITA, **(parametros or {})})

    @staticmethod
    def _filtros(setor: str | None, periodo: dict | None, indicador: str | None = None) -> tuple[str, dict]:
        condicoes, parametros = [ELEGIVEL], {"setor": setor, "indicador": indicador}
        if setor:
            condicoes.append(_NO_SETOR)
        if periodo:
            condicoes.append(_NO_PERIODO)
            parametros.update(periodo)
        if indicador:
            condicoes.append("d.indicador_codigo = :indicador")
        return " AND ".join(condicoes), parametros

    def setor(self, codigo: str) -> Row | None:
        return self._executar(
            "SELECT codigo, nome FROM setores_observatorio WHERE codigo = :codigo", {"codigo": codigo}
        ).one_or_none()

    def setores_disponiveis(self) -> list[Row]:
        return list(
            self._executar(
                f"""
                SELECT s.codigo, s.nome FROM setores_observatorio s
                WHERE EXISTS(
                    SELECT 1 {_DADOS} JOIN indicador_setores x ON x.indicador_codigo = d.indicador_codigo
                    WHERE x.setor_codigo = s.codigo AND {ELEGIVEL}
                )
                ORDER BY s.nome
                """
            )
        )

    def periodos_disponiveis(self, setor: str | None) -> list[Row]:
        where, parametros = self._filtros(setor, None)
        return list(
            self._executar(
                f"SELECT DISTINCT d.referencia_tipo, d.ano_inicio, d.ano_fim, d.mes, d.data_extracao "
                f"{_DADOS} WHERE {where}",
                parametros,
            )
        )

    def dados(self, setor: str | None, periodo: dict | None, indicador: str | None = None) -> list[Row]:
        where, parametros = self._filtros(setor, periodo, indicador)
        return list(self._executar(f"{SELECT_DADO} WHERE {where}{ORDEM_DADOS}", parametros))

    def dado(self, dado_id: str) -> Row | None:
        return self._executar(f"{SELECT_DADO} WHERE {ELEGIVEL} AND d.id = :id", {"id": dado_id}).one_or_none()

    def definicoes(self, codigos: list[str]) -> list[Row]:
        return list(
            self._executar(
                """
                SELECT d.codigo, d.nome, d.definicao, d.nota_metodologica,
                       json_build_object('codigo', u.codigo, 'nome', u.nome, 'inteira', u.inteira,
                                         'maximo', u.maximo, 'casas_exibicao', u.casas_exibicao) AS unidade,
                       COALESCE((SELECT json_agg(json_build_object('codigo', s.codigo, 'nome', s.nome) ORDER BY s.nome)
                                 FROM indicador_setores x JOIN setores_observatorio s ON s.codigo = x.setor_codigo
                                 WHERE x.indicador_codigo = d.codigo), '[]') AS setores,
                       COALESCE((SELECT json_agg(json_build_object('codigo', c.codigo, 'nome', c.nome) ORDER BY c.nome)
                                 FROM indicador_classificacoes x JOIN classificacoes c
                                   ON c.codigo = x.classificacao_codigo
                                 WHERE x.indicador_codigo = d.codigo), '[]') AS classificacoes
                FROM indicadores_definicoes d JOIN unidades u ON u.codigo = d.unidade_codigo
                WHERE d.codigo = ANY(:codigos)
                ORDER BY d.nome
                """,
                {"codigos": codigos},
            )
        )

    def fontes(self) -> list[Row]:
        return list(
            self._executar(
                f"""
                SELECT f.codigo, f.nome, f.links, count(DISTINCT d.indicador_codigo) AS indicadores
                {_DADOS} JOIN fontes f ON f.codigo = d.fonte_codigo
                WHERE {ELEGIVEL}
                GROUP BY f.codigo, f.nome, f.links
                ORDER BY f.nome
                """
            )
        )
