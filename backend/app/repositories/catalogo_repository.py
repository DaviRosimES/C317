from sqlalchemy import text
from sqlalchemy.engine import Connection, Row


class CatalogoRepository:
    def __init__(self, connection: Connection):
        self.connection = connection

    def get_tipo(self, codigo: str) -> Row | None:
        return self.connection.execute(
            text("SELECT codigo, unidade, escopo FROM tipos_indicadores WHERE codigo = :codigo"),
            {"codigo": codigo},
        ).one_or_none()

    def get_setor_id(self, codigo_cnae: str) -> int | None:
        return self.connection.execute(
            text("SELECT id FROM setores WHERE codigo_cnae = :codigo"),
            {"codigo": codigo_cnae},
        ).scalar_one_or_none()

    def estabelecimento_existe(self, estabelecimento_id: int) -> bool:
        return self.connection.execute(
            text("SELECT EXISTS(SELECT 1 FROM estabelecimentos WHERE id = :id)"),
            {"id": estabelecimento_id},
        ).scalar_one()

    def listar_cnaes(self) -> list[Row]:
        return list(
            self.connection.execute(
                text(
                    """
                    SELECT s.id, s.codigo_cnae AS codigo, s.nome, s.fonte_cnae AS fonte,
                           s.provisorio,
                           COALESCE(array_agg(sr.rota_codigo ORDER BY sr.rota_codigo)
                                    FILTER (WHERE sr.rota_codigo IS NOT NULL), '{}') AS rotas
                    FROM setores s
                    LEFT JOIN setores_rotas sr ON sr.setor_id = s.id
                    WHERE s.codigo_cnae IS NOT NULL
                    GROUP BY s.id
                    ORDER BY s.codigo_cnae
                    """
                )
            )
        )

    def listar_tipos(self) -> list[Row]:
        return list(
            self.connection.execute(
                text(
                    """
                    SELECT codigo, nome, descricao, unidade, escopo, fonte_referencia, provisorio
                    FROM tipos_indicadores ORDER BY nome
                    """
                )
            )
        )

    def listar_rotas(self) -> list[Row]:
        return list(
            self.connection.execute(
                text(
                    """
                    SELECT r.codigo, r.nome, r.descricao,
                           COALESCE(array_agg(s.codigo_cnae ORDER BY s.codigo_cnae)
                                    FILTER (WHERE s.codigo_cnae IS NOT NULL), '{}') AS cnaes
                    FROM rotas r
                    LEFT JOIN setores_rotas sr ON sr.rota_codigo = r.codigo
                    LEFT JOIN setores s ON s.id = sr.setor_id
                    GROUP BY r.codigo
                    ORDER BY r.nome
                    """
                )
            )
        )
