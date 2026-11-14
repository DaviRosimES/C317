from sqlalchemy import text
from sqlalchemy.engine import Connection, Row

_SELECT = """
    SELECT r.id, r.titulo, r.numero, r.tipo, r.fonte, r.data_publicacao, p.ano, p.mes,
           r.status, r.arquivado, r.link_externo, r.demonstracao, r.arquivo_url, r.arquivo_nome,
           r.arquivo_url IS NOT NULL AS possui_pdf
    FROM relatorios r
    LEFT JOIN periodos p ON p.id = r.periodo_id
"""
# Elegível ao público: publicado e não arquivado. Vale para lista, detalhe e download.
_PUBLICO = "r.status = 'publicado' AND NOT r.arquivado"
# Sem data conhecida, o relatório vai para o fim da lista em vez de receber uma data.
_ORDEM = " ORDER BY r.data_publicacao DESC NULLS LAST, r.id DESC"


class RelatorioRepository:
    def __init__(self, connection: Connection):
        self.connection = connection

    def _executar(self, sql: str, parametros: dict | None = None):
        return self.connection.execute(text(sql), parametros or {})

    # Consulta pública

    def listar_publicados(self) -> list[Row]:
        return list(self._executar(f"{_SELECT} WHERE {_PUBLICO}{_ORDEM}"))

    def get_publicado(self, relatorio_id: int) -> Row | None:
        return self._executar(
            f"{_SELECT} WHERE {_PUBLICO} AND r.id = :id", {"id": relatorio_id}
        ).one_or_none()

    # Administração

    def listar(self, situacao: str, status: str | None) -> list[Row]:
        condicoes = []
        if situacao == "ativos":
            condicoes.append("NOT r.arquivado")
        elif situacao == "arquivados":
            condicoes.append("r.arquivado")
        if status:
            condicoes.append("r.status = :status")
        where = f" WHERE {' AND '.join(condicoes)}" if condicoes else ""
        return list(self._executar(f"{_SELECT}{where}{_ORDEM}", {"status": status}))

    def get(self, relatorio_id: int) -> Row | None:
        return self._executar(f"{_SELECT} WHERE r.id = :id", {"id": relatorio_id}).one_or_none()

    def periodo(self, ano: int | None, mes: int | None) -> int | None:
        """Período existente ou criado; mês nulo representa o ano completo."""
        if ano is None:
            return None
        conflito = "(ano) WHERE mes IS NULL" if mes is None else "(ano, mes)"
        return self._executar(
            f"""
            INSERT INTO periodos (ano, mes) VALUES (:ano, :mes)
            ON CONFLICT {conflito} DO UPDATE SET ano = EXCLUDED.ano
            RETURNING id
            """,
            {"ano": ano, "mes": mes},
        ).scalar_one()

    def inserir(self, campos: dict) -> int:
        return self._executar(
            """
            INSERT INTO relatorios
                (periodo_id, titulo, numero, tipo, fonte, data_publicacao, arquivo_url, arquivo_nome,
                 status, arquivado, demonstracao)
            VALUES (:periodo_id, :titulo, :numero, :tipo, :fonte, :data_publicacao, :arquivo_url,
                    :arquivo_nome, 'rascunho', false, false)
            RETURNING id
            """,
            campos,
        ).scalar_one()

    def atualizar_metadados(self, relatorio_id: int, campos: dict) -> None:
        self._executar(
            """
            UPDATE relatorios
            SET titulo = :titulo, numero = :numero, tipo = :tipo, fonte = :fonte,
                data_publicacao = :data_publicacao, periodo_id = :periodo_id
            WHERE id = :id
            """,
            {**campos, "id": relatorio_id},
        )

    def substituir_arquivo(self, relatorio_id: int, arquivo_url: str, arquivo_nome: str | None) -> None:
        # Um único conteúdo vigente: o PDF novo substitui o anterior ou o link legado.
        self._executar(
            """
            UPDATE relatorios
            SET arquivo_url = :arquivo_url, arquivo_nome = :arquivo_nome, link_externo = NULL
            WHERE id = :id
            """,
            {"id": relatorio_id, "arquivo_url": arquivo_url, "arquivo_nome": arquivo_nome},
        )

    def definir_status(self, relatorio_id: int, status: str) -> None:
        self._executar(
            "UPDATE relatorios SET status = :status WHERE id = :id",
            {"id": relatorio_id, "status": status},
        )

    def definir_arquivado(self, relatorio_id: int, arquivado: bool) -> None:
        self._executar(
            "UPDATE relatorios SET arquivado = :arquivado WHERE id = :id",
            {"id": relatorio_id, "arquivado": arquivado},
        )
