from sqlalchemy import text
from sqlalchemy.engine import Connection, Row

from app.core.dados import TERRITORIO_SANTA_RITA

# Visível ao público: a mesma regra na lista, nas opções, no detalhe e no acesso por id.
ELEGIVEL = (
    "d.status = 'publicado' AND NOT d.arquivado AND NOT d.divulgacao_bloqueada "
    "AND NOT i.arquivado AND d.territorio_codigo = :santa_rita"
)

SELECT_DADO = f"""
    SELECT d.id, d.indicador_codigo, i.nome AS indicador_nome, i.arquivado AS indicador_arquivado,
           u.codigo AS unidade_codigo, u.nome AS unidade_nome, u.inteira, u.maximo, u.casas_exibicao,
           t.codigo AS territorio_codigo, t.nome AS territorio_nome,
           k.codigo AS categoria_codigo, k.nome AS categoria_nome, k.classificacao_codigo,
           c.nome AS classificacao_nome, k.codigo_cnae,
           f.codigo AS fonte_codigo, f.nome AS fonte_nome, f.links AS fonte_links,
           d.referencia_tipo, d.ano_inicio, d.ano_fim, d.mes, d.data_extracao,
           d.valor::text AS valor, d.qualificador, d.notas, d.origens,
           d.status, d.arquivado, d.divulgacao_bloqueada, d.motivo_bloqueio, d.demonstracao,
           ({ELEGIVEL}) AS visivel_publicamente
    FROM dados_indicadores d
    JOIN indicadores_definicoes i ON i.codigo = d.indicador_codigo
    JOIN unidades u ON u.codigo = i.unidade_codigo
    JOIN territorios t ON t.codigo = d.territorio_codigo
    JOIN fontes f ON f.codigo = d.fonte_codigo
    LEFT JOIN categorias k ON k.codigo = d.categoria_codigo
    LEFT JOIN classificacoes c ON c.codigo = k.classificacao_codigo
"""
ORDEM_DADOS = (
    " ORDER BY i.nome, d.ano_fim DESC, d.ano_inicio DESC, d.referencia_tipo, d.mes DESC NULLS LAST,"
    " c.nome NULLS FIRST, k.nome NULLS FIRST, f.nome, d.id"
)


class DadoIndicadorRepository:
    def __init__(self, connection: Connection):
        self.connection = connection

    def _executar(self, sql: str, parametros: dict | None = None):
        return self.connection.execute(text(sql), {"santa_rita": TERRITORIO_SANTA_RITA, **(parametros or {})})

    def listar(self, indicador: str | None, situacao: str, status: str | None) -> list[Row]:
        condicoes = []
        if indicador:
            condicoes.append("d.indicador_codigo = :indicador")
        if situacao == "ativos":
            condicoes.append("NOT d.arquivado")
        elif situacao == "arquivados":
            condicoes.append("d.arquivado")
        if status:
            condicoes.append("d.status = :status")
        where = f" WHERE {' AND '.join(condicoes)}" if condicoes else ""
        return list(
            self._executar(f"{SELECT_DADO}{where}{ORDEM_DADOS}", {"indicador": indicador, "status": status})
        )

    def get(self, dado_id: str) -> Row | None:
        return self._executar(f"{SELECT_DADO} WHERE d.id = :id", {"id": dado_id}).one_or_none()

    def campos(self, dado_id: str) -> Row | None:
        """Os campos editáveis crus, para mesclar uma correção parcial."""
        return self._executar(
            """
            SELECT id, indicador_codigo, categoria_codigo, fonte_codigo, referencia_tipo, ano_inicio,
                   ano_fim, mes, data_extracao, valor::text AS valor, qualificador, notas,
                   status, arquivado, divulgacao_bloqueada
            FROM dados_indicadores WHERE id = :id
            """,
            {"id": dado_id},
        ).one_or_none()

    def regras(self, indicador: str) -> Row | None:
        """Definição e unidade que restringem os dados do indicador."""
        return self._executar(
            """
            SELECT d.codigo, d.arquivado, d.tipos_referencia_permitidos, d.aceita_sem_categoria,
                   ARRAY(SELECT classificacao_codigo FROM indicador_classificacoes
                         WHERE indicador_codigo = d.codigo) AS classificacoes_permitidas,
                   u.nome AS unidade_nome, u.inteira, u.maximo
            FROM indicadores_definicoes d JOIN unidades u ON u.codigo = d.unidade_codigo
            WHERE d.codigo = :codigo
            """,
            {"codigo": indicador},
        ).one_or_none()

    def classificacao_da_categoria(self, categoria: str) -> str | None:
        return self._executar(
            "SELECT classificacao_codigo FROM categorias WHERE codigo = :codigo", {"codigo": categoria}
        ).scalar_one_or_none()

    def fonte_existe(self, fonte: str) -> bool:
        return self._executar(
            "SELECT EXISTS(SELECT 1 FROM fontes WHERE codigo = :codigo)", {"codigo": fonte}
        ).scalar_one()

    def mesma_identidade(self, campos: dict) -> str | None:
        """Outro dado com a mesma combinação de indicador, território, categoria, referência e fonte."""
        return self._executar(
            """
            SELECT id FROM dados_indicadores
            WHERE id <> :id AND indicador_codigo = :indicador_codigo
              AND territorio_codigo = :territorio_codigo
              AND categoria_codigo IS NOT DISTINCT FROM :categoria_codigo
              AND fonte_codigo = :fonte_codigo AND referencia_tipo = :referencia_tipo
              AND ano_inicio = :ano_inicio AND ano_fim = :ano_fim
              AND mes IS NOT DISTINCT FROM CAST(:mes AS integer)
              AND data_extracao IS NOT DISTINCT FROM CAST(:data_extracao AS date)
            """,
            campos,
        ).scalar_one_or_none()

    def inserir(self, campos: dict) -> None:
        self._executar(
            """
            INSERT INTO dados_indicadores
                (id, indicador_codigo, territorio_codigo, categoria_codigo, fonte_codigo,
                 referencia_tipo, ano_inicio, ano_fim, mes, data_extracao, valor, qualificador, notas)
            VALUES (:id, :indicador_codigo, :territorio_codigo, :categoria_codigo, :fonte_codigo,
                    :referencia_tipo, :ano_inicio, :ano_fim, :mes, :data_extracao,
                    CAST(:valor AS numeric), :qualificador, :notas)
            """,
            campos,
        )

    def atualizar(self, campos: dict) -> None:
        self._executar(
            """
            UPDATE dados_indicadores
            SET categoria_codigo = :categoria_codigo, fonte_codigo = :fonte_codigo,
                referencia_tipo = :referencia_tipo, ano_inicio = :ano_inicio, ano_fim = :ano_fim,
                mes = :mes, data_extracao = :data_extracao, valor = CAST(:valor AS numeric),
                qualificador = :qualificador, notas = :notas
            WHERE id = :id
            """,
            campos,
        )

    def definir(self, dado_id: str, **valores) -> None:
        """Atualiza só campos de estado (status, arquivado, bloqueio)."""
        permitidos = {"status", "arquivado", "divulgacao_bloqueada", "motivo_bloqueio"}
        assert set(valores) <= permitidos
        atribuicoes = ", ".join(f"{campo} = :{campo}" for campo in valores)
        self._executar(f"UPDATE dados_indicadores SET {atribuicoes} WHERE id = :id", {"id": dado_id, **valores})
