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
