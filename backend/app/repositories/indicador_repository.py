from sqlalchemy import text
from sqlalchemy.engine import Connection, Row

_SELECT = """
    SELECT i.id, i.tipo, t.nome, t.unidade, t.escopo, i.valor, p.ano, p.mes,
           s.codigo_cnae, i.estabelecimento_id, i.origem AS fonte, i.demonstracao,
           i.status, i.validado_por
    FROM indicadores i
    JOIN tipos_indicadores t ON t.codigo = i.tipo
    JOIN periodos p ON p.id = i.periodo_id
    LEFT JOIN setores s ON s.id = i.setor_id
"""


class IndicadorRepository:
    def __init__(self, connection: Connection):
        self.connection = connection

    def get(self, indicador_id: int) -> Row | None:
        return self.connection.execute(
            text(_SELECT + " WHERE i.id = :id"), {"id": indicador_id}
        ).one_or_none()

    def listar(self, status: str | None = None) -> list[Row]:
        return list(
            self.connection.execute(
                text(
                    _SELECT
                    + """
                    WHERE CAST(:status AS text) IS NULL OR i.status = :status
                    ORDER BY p.ano DESC, p.mes DESC NULLS FIRST, i.tipo, s.codigo_cnae, i.id
                    """
                ),
                {"status": status},
            )
        )

    def obter_periodo(self, ano: int, mes: int | None) -> int:
        """Retorna o período existente ou o cria; mês nulo representa o ano completo."""
        conflito = "(ano) WHERE mes IS NULL" if mes is None else "(ano, mes)"
        return self.connection.execute(
            text(
                f"""
                INSERT INTO periodos (ano, mes) VALUES (:ano, :mes)
                ON CONFLICT {conflito} DO UPDATE SET ano = EXCLUDED.ano
                RETURNING id
                """
            ),
            {"ano": ano, "mes": mes},
        ).scalar_one()

    def inserir(self, registro: dict) -> int:
        return self.connection.execute(
            text(
                """
                INSERT INTO indicadores
                    (tipo, valor, periodo_id, origem, setor_id, estabelecimento_id,
                     demonstracao, status)
                VALUES (:tipo, :valor, :periodo_id, :origem, :setor_id, :estabelecimento_id,
                        :demonstracao, 'rascunho')
                RETURNING id
                """
            ),
            registro,
        ).scalar_one()

    def atualizar(self, indicador_id: int, registro: dict, validado_por: int | None) -> None:
        self.connection.execute(
            text(
                """
                UPDATE indicadores
                SET tipo = :tipo, valor = :valor, periodo_id = :periodo_id, origem = :origem,
                    setor_id = :setor_id, estabelecimento_id = :estabelecimento_id,
                    demonstracao = :demonstracao,
                    validado_por = COALESCE(:validado_por, validado_por)
                WHERE id = :id
                """
            ),
            {**registro, "id": indicador_id, "validado_por": validado_por},
        )

    def publicar(self, indicador_id: int, admin_id: int) -> None:
        self.connection.execute(
            text(
                """
                UPDATE indicadores SET status = 'publicado', validado_por = :admin
                WHERE id = :id AND status <> 'publicado'
                """
            ),
            {"id": indicador_id, "admin": admin_id},
        )
