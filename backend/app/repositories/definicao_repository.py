from sqlalchemy import text
from sqlalchemy.engine import Connection, Row

# Tabelas cujo código é gerado pelo sistema; nomes fixos, nunca vindos da requisição.
TABELAS_CODIGO = {
    "indicadores_definicoes",
    "fontes",
    "classificacoes",
    "categorias",
    "setores_observatorio",
    "unidades",
}

_DEFINICAO = """
    SELECT d.codigo, d.nome, d.definicao, d.nota_metodologica, d.tipos_referencia_permitidos,
           d.aceita_sem_categoria, d.arquivado,
           json_build_object(
               'codigo', u.codigo, 'nome', u.nome, 'inteira', u.inteira,
               'maximo', u.maximo, 'casas_exibicao', u.casas_exibicao
           ) AS unidade,
           COALESCE((
               SELECT json_agg(json_build_object('codigo', s.codigo, 'nome', s.nome) ORDER BY s.nome)
               FROM indicador_setores i JOIN setores_observatorio s ON s.codigo = i.setor_codigo
               WHERE i.indicador_codigo = d.codigo
           ), '[]') AS setores,
           COALESCE((
               SELECT json_agg(json_build_object('codigo', c.codigo, 'nome', c.nome) ORDER BY c.nome)
               FROM indicador_classificacoes i JOIN classificacoes c ON c.codigo = i.classificacao_codigo
               WHERE i.indicador_codigo = d.codigo
           ), '[]') AS classificacoes_permitidas,
           (SELECT count(*) FROM observacoes_m6 o WHERE o.indicador_codigo = d.codigo) AS total_dados
    FROM indicadores_definicoes d
    JOIN unidades u ON u.codigo = d.unidade_codigo
"""


class DefinicaoRepository:
    def __init__(self, connection: Connection):
        self.connection = connection

    def _executar(self, sql: str, parametros: dict | None = None):
        return self.connection.execute(text(sql), parametros or {})

    # Utilitários

    def codigo_existe(self, tabela: str, codigo: str) -> bool:
        assert tabela in TABELAS_CODIGO
        return self._executar(
            f"SELECT EXISTS(SELECT 1 FROM {tabela} WHERE codigo = :codigo)", {"codigo": codigo}
        ).scalar_one()

    def codigo_em_dados(self, indicador_codigo: str) -> bool:
        return self._executar(
            "SELECT EXISTS(SELECT 1 FROM observacoes_m6 WHERE indicador_codigo = :codigo)",
            {"codigo": indicador_codigo},
        ).scalar_one()

    def existentes(self, tabela: str, codigos: list[str]) -> set[str]:
        assert tabela in TABELAS_CODIGO
        return set(
            self._executar(
                f"SELECT codigo FROM {tabela} WHERE codigo = ANY(:codigos)", {"codigos": codigos}
            ).scalars()
        )

    # Catálogos

    def setores(self) -> list[Row]:
        return list(
            self._executar(
                """
                SELECT s.codigo, s.nome,
                       EXISTS(SELECT 1 FROM indicador_setores i WHERE i.setor_codigo = s.codigo) AS em_uso
                FROM setores_observatorio s ORDER BY s.nome
                """
            )
        )

    def unidades(self) -> list[Row]:
        return list(
            self._executar(
                """
                SELECT u.codigo, u.nome, u.inteira, u.maximo, u.casas_exibicao,
                       EXISTS(SELECT 1 FROM indicadores_definicoes d WHERE d.unidade_codigo = u.codigo)
                       OR EXISTS(SELECT 1 FROM observacoes_m6 o WHERE o.unidade_codigo = u.codigo) AS em_uso
                FROM unidades u ORDER BY u.nome
                """
            )
        )

    def fontes(self, codigo: str | None = None) -> list[Row]:
        return list(
            self._executar(
                """
                SELECT f.codigo, f.nome, f.links,
                       EXISTS(SELECT 1 FROM observacoes_m6 o WHERE o.fonte_codigo = f.codigo) AS em_uso
                FROM fontes f
                WHERE CAST(:codigo AS text) IS NULL OR f.codigo = :codigo
                ORDER BY f.nome
                """,
                {"codigo": codigo},
            )
        )

    def classificacoes(self, codigo: str | None = None) -> list[Row]:
        return list(
            self._executar(
                """
                SELECT c.codigo, c.nome,
                       EXISTS(SELECT 1 FROM indicador_classificacoes i
                              WHERE i.classificacao_codigo = c.codigo)
                       OR EXISTS(SELECT 1 FROM categorias k JOIN observacoes_m6 o
                                   ON o.categoria_codigo = k.codigo
                                 WHERE k.classificacao_codigo = c.codigo) AS em_uso
                FROM classificacoes c
                WHERE CAST(:codigo AS text) IS NULL OR c.codigo = :codigo
                ORDER BY c.nome
                """,
                {"codigo": codigo},
            )
        )

    def categorias(self, codigo: str | None = None) -> list[Row]:
        return list(
            self._executar(
                """
                SELECT k.codigo, k.nome, k.classificacao_codigo, k.codigo_cnae,
                       EXISTS(SELECT 1 FROM observacoes_m6 o WHERE o.categoria_codigo = k.codigo) AS em_uso
                FROM categorias k
                WHERE CAST(:codigo AS text) IS NULL OR k.codigo = :codigo
                ORDER BY k.classificacao_codigo, k.nome
                """,
                {"codigo": codigo},
            )
        )

    def inserir_fonte(self, codigo: str, nome: str, links: list[str]) -> None:
        self._executar(
            "INSERT INTO fontes (codigo, nome, links) VALUES (:codigo, :nome, :links)",
            {"codigo": codigo, "nome": nome, "links": links},
        )

    def atualizar_fonte(self, codigo: str, nome: str, links: list[str]) -> None:
        self._executar(
            "UPDATE fontes SET nome = :nome, links = :links WHERE codigo = :codigo",
            {"codigo": codigo, "nome": nome, "links": links},
        )

    def inserir_classificacao(self, codigo: str, nome: str) -> None:
        self._executar(
            "INSERT INTO classificacoes (codigo, nome) VALUES (:codigo, :nome)",
            {"codigo": codigo, "nome": nome},
        )

    def atualizar_classificacao(self, codigo: str, nome: str) -> None:
        self._executar(
            "UPDATE classificacoes SET nome = :nome WHERE codigo = :codigo",
            {"codigo": codigo, "nome": nome},
        )

    def inserir_categoria(self, campos: dict) -> None:
        self._executar(
            """
            INSERT INTO categorias (codigo, nome, classificacao_codigo, codigo_cnae)
            VALUES (:codigo, :nome, :classificacao_codigo, :codigo_cnae)
            """,
            campos,
        )

    def atualizar_categoria(self, campos: dict) -> None:
        self._executar(
            """
            UPDATE categorias
            SET nome = :nome, classificacao_codigo = :classificacao_codigo, codigo_cnae = :codigo_cnae
            WHERE codigo = :codigo
            """,
            campos,
        )

    # Definições

    def listar(self, situacao: str, setor: str | None, busca: str | None) -> list[Row]:
        condicoes = []
        if situacao == "ativos":
            condicoes.append("NOT d.arquivado")
        elif situacao == "arquivados":
            condicoes.append("d.arquivado")
        if setor:
            condicoes.append(
                "EXISTS(SELECT 1 FROM indicador_setores i "
                "WHERE i.indicador_codigo = d.codigo AND i.setor_codigo = :setor)"
            )
        if busca:
            condicoes.append("d.nome ILIKE '%' || :busca || '%'")
        where = f"WHERE {' AND '.join(condicoes)}" if condicoes else ""
        return list(
            self._executar(f"{_DEFINICAO} {where} ORDER BY d.nome", {"setor": setor, "busca": busca})
        )

    def get(self, codigo: str) -> Row | None:
        return self._executar(f"{_DEFINICAO} WHERE d.codigo = :codigo", {"codigo": codigo}).one_or_none()

    def campos(self, codigo: str) -> Row | None:
        """Os campos crus da definição, para validar uma correção."""
        return self._executar(
            """
            SELECT d.codigo, d.nome, d.definicao, d.nota_metodologica, d.unidade_codigo,
                   d.tipos_referencia_permitidos, d.aceita_sem_categoria, d.arquivado,
                   ARRAY(SELECT setor_codigo FROM indicador_setores
                         WHERE indicador_codigo = d.codigo ORDER BY setor_codigo) AS setores,
                   ARRAY(SELECT classificacao_codigo FROM indicador_classificacoes
                         WHERE indicador_codigo = d.codigo ORDER BY classificacao_codigo)
                       AS classificacoes_permitidas
            FROM indicadores_definicoes d WHERE d.codigo = :codigo
            """,
            {"codigo": codigo},
        ).one_or_none()

    def inserir(self, campos: dict) -> None:
        self._executar(
            """
            INSERT INTO indicadores_definicoes
                (codigo, nome, definicao, unidade_codigo, tipos_referencia_permitidos,
                 aceita_sem_categoria, nota_metodologica)
            VALUES (:codigo, :nome, :definicao, :unidade_codigo, :tipos_referencia_permitidos,
                    :aceita_sem_categoria, :nota_metodologica)
            """,
            campos,
        )

    def atualizar(self, campos: dict) -> None:
        self._executar(
            """
            UPDATE indicadores_definicoes
            SET nome = :nome, definicao = :definicao, unidade_codigo = :unidade_codigo,
                tipos_referencia_permitidos = :tipos_referencia_permitidos,
                aceita_sem_categoria = :aceita_sem_categoria, nota_metodologica = :nota_metodologica
            WHERE codigo = :codigo
            """,
            campos,
        )

    def definir_setores(self, codigo: str, setores: list[str]) -> None:
        self._executar("DELETE FROM indicador_setores WHERE indicador_codigo = :codigo", {"codigo": codigo})
        self._executar(
            """
            INSERT INTO indicador_setores (indicador_codigo, setor_codigo)
            SELECT :codigo, unnest(CAST(:setores AS text[]))
            """,
            {"codigo": codigo, "setores": setores},
        )

    def definir_classificacoes(self, codigo: str, classificacoes: list[str]) -> None:
        self._executar(
            "DELETE FROM indicador_classificacoes WHERE indicador_codigo = :codigo", {"codigo": codigo}
        )
        self._executar(
            """
            INSERT INTO indicador_classificacoes (indicador_codigo, classificacao_codigo)
            SELECT :codigo, unnest(CAST(:classificacoes AS text[]))
            """,
            {"codigo": codigo, "classificacoes": classificacoes},
        )

    def definir_arquivado(self, codigo: str, arquivado: bool) -> None:
        self._executar(
            "UPDATE indicadores_definicoes SET arquivado = :arquivado WHERE codigo = :codigo",
            {"codigo": codigo, "arquivado": arquivado},
        )

    def vinculos(self, codigo: str) -> list[Row]:
        """Dados vinculados ao código (qualquer estado), agrupados pelo que a definição restringe."""
        return list(
            self._executar(
                """
                SELECT o.unidade_codigo, o.referencia_tipo,
                       o.categoria_codigo IS NULL AS sem_categoria,
                       COALESCE(k.classificacao_codigo, m.conteudo->>'classificacao') AS classificacao,
                       count(*) AS quantidade
                FROM observacoes_m6 o
                LEFT JOIN categorias k ON k.codigo = o.categoria_codigo
                LEFT JOIN catalogos_m6 m ON m.tipo = 'categorias' AND m.codigo = o.categoria_codigo
                WHERE o.indicador_codigo = :codigo
                GROUP BY 1, 2, 3, 4
                """,
                {"codigo": codigo},
            )
        )
