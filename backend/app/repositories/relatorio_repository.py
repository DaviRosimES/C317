from sqlalchemy import text
from sqlalchemy.engine import Connection, Row

_SELECT_PUBLICADOS = """
    SELECT r.id, r.titulo, r.fonte, r.data_publicacao, p.ano, p.mes, r.demonstracao,
           r.arquivo_url
    FROM relatorios r
    JOIN periodos p ON p.id = r.periodo_id
    WHERE r.status = 'publicado'
"""


class RelatorioRepository:
    """Leitura pública: somente relatórios publicados."""

    def __init__(self, connection: Connection):
        self.connection = connection

    def listar_publicados(self) -> list[Row]:
        return list(
            self.connection.execute(
                text(_SELECT_PUBLICADOS + " ORDER BY r.data_publicacao DESC, r.id DESC")
            )
        )

    def get_publicado(self, relatorio_id: int) -> Row | None:
        return self.connection.execute(
            text(_SELECT_PUBLICADOS + " AND r.id = :id"), {"id": relatorio_id}
        ).one_or_none()
