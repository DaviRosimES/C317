import json

from sqlalchemy import text
from sqlalchemy.engine import Connection, Row

_COLUNAS = """
    id, valor, conteudo, status, demonstracao, divulgacao_bloqueada, motivo_bloqueio,
    publicado_por, publicado_em
"""
# Visível ao público somente o que foi publicado e não está bloqueado.
_PUBLICAS = "status = 'publicado' AND NOT divulgacao_bloqueada"

# Filtros -> condição SQL sobre as colunas geradas da V5.
_FILTROS = {
    "indicadores": "indicador_codigo = ANY(:indicadores)",
    "territorios": "territorio_codigo = ANY(:territorios)",
    "categorias": "categoria_codigo = ANY(:categorias)",
    "temas": "conteudo->'temas' ?| CAST(:temas AS text[])",
    "codigos_cnae": "conteudo->>'codigo_cnae' = ANY(:codigos_cnae)",
    "referencia_tipos": "referencia_tipo = ANY(:referencia_tipos)",
    # Um ano só seleciona referências pontuais daquele ano: o acumulado 2000–2024
    # não aparece como dado de 2024.
    "ano": "ano_inicio = :ano AND ano_fim = :ano",
    "ano_inicio": "ano_inicio = :ano_inicio",
    "ano_fim": "ano_fim = :ano_fim",
    "mes": "mes = :mes",
    "status": "status = :status",
    "divulgacao_bloqueada": "divulgacao_bloqueada = :divulgacao_bloqueada",
}


class ObservacaoRepository:
    def __init__(self, connection: Connection):
        self.connection = connection

    def catalogos(self) -> dict[str, dict[str, dict]]:
        catalogos: dict[str, dict[str, dict]] = {}
        for linha in self.connection.execute(
            text("SELECT tipo, codigo, conteudo FROM catalogos_m6 ORDER BY tipo, codigo")
        ):
            catalogos.setdefault(linha.tipo, {})[linha.codigo] = linha.conteudo
        return catalogos

    def codigos_publicados(self) -> dict[str, set[str]]:
        """Códigos de catálogo usados por ao menos uma observação pública."""
        linhas = self.connection.execute(
            text(
                f"""
                SELECT indicador_codigo, territorio_codigo, categoria_codigo, unidade_codigo,
                       fonte_codigo, conteudo->'temas' AS temas
                FROM observacoes_m6 WHERE {_PUBLICAS}
                """
            )
        ).all()
        usados = {tipo: set() for tipo in ("indicadores", "territorios", "categorias", "unidades", "fontes", "temas")}
        for linha in linhas:
            usados["indicadores"].add(linha.indicador_codigo)
            usados["territorios"].add(linha.territorio_codigo)
            usados["unidades"].add(linha.unidade_codigo)
            usados["fontes"].add(linha.fonte_codigo)
            if linha.categoria_codigo:
                usados["categorias"].add(linha.categoria_codigo)
            usados["temas"].update(linha.temas)
        return usados

    def listar(self, filtros: dict, somente_publicas: bool) -> list[Row]:
        condicoes = [_PUBLICAS] if somente_publicas else []
        parametros = {}
        for nome, valor in filtros.items():
            if valor is None or valor == []:
                continue
            condicoes.append(_FILTROS[nome])
            parametros[nome] = valor
        where = f"WHERE {' AND '.join(condicoes)}" if condicoes else ""
        return list(
            self.connection.execute(
                text(
                    f"""
                    SELECT {_COLUNAS} FROM observacoes_m6 {where}
                    ORDER BY indicador_codigo, territorio_codigo, categoria_codigo NULLS FIRST,
                             ano_inicio, ano_fim, mes NULLS FIRST, id
                    """
                ),
                parametros,
            )
        )

    def get(self, observacao_id: str, somente_publica: bool = False) -> Row | None:
        filtro = f"AND {_PUBLICAS}" if somente_publica else ""
        return self.connection.execute(
            text(f"SELECT {_COLUNAS} FROM observacoes_m6 WHERE id = :id {filtro}"),
            {"id": observacao_id},
        ).one_or_none()

    def referencias_publicadas(self) -> list[dict]:
        return [
            linha.referencia
            for linha in self.connection.execute(
                text(
                    f"""
                    SELECT DISTINCT conteudo->'referencia' AS referencia, referencia_tipo,
                           ano_inicio, ano_fim, mes
                    FROM observacoes_m6 WHERE {_PUBLICAS}
                    ORDER BY ano_fim DESC, ano_inicio DESC, mes DESC NULLS FIRST, referencia_tipo
                    """
                )
            )
        ]

    def inserir(self, conteudo: dict) -> None:
        self.connection.execute(
            text(
                """
                INSERT INTO observacoes_m6 (id, valor, conteudo)
                VALUES (:id, CAST(:valor AS numeric), CAST(:conteudo AS jsonb))
                """
            ),
            {"id": conteudo["id"], "valor": conteudo["valor"], "conteudo": json.dumps(conteudo)},
        )

    def atualizar_conteudo(self, observacao_id: str, conteudo: dict, responsavel: int | None) -> None:
        # Um valor já público passa a ter como responsável quem o corrigiu.
        self.connection.execute(
            text(
                """
                UPDATE observacoes_m6
                SET valor = CAST(:valor AS numeric), conteudo = CAST(:conteudo AS jsonb),
                    publicado_por = COALESCE(:responsavel, publicado_por),
                    publicado_em = CASE WHEN CAST(:responsavel AS integer) IS NULL
                                        THEN publicado_em ELSE now() END
                WHERE id = :id
                """
            ),
            {
                "id": observacao_id,
                "valor": conteudo["valor"],
                "conteudo": json.dumps(conteudo),
                "responsavel": responsavel,
            },
        )

    def publicar(self, observacao_id: str, admin_id: int) -> None:
        self.connection.execute(
            text(
                """
                UPDATE observacoes_m6
                SET status = 'publicado', publicado_por = :admin, publicado_em = now()
                WHERE id = :id AND status <> 'publicado'
                """
            ),
            {"id": observacao_id, "admin": admin_id},
        )

    def despublicar(self, observacao_id: str) -> None:
        self.connection.execute(
            text(
                """
                UPDATE observacoes_m6
                SET status = 'rascunho', publicado_por = NULL, publicado_em = NULL
                WHERE id = :id
                """
            ),
            {"id": observacao_id},
        )

    def bloquear(self, observacao_id: str, motivo: str) -> None:
        # Bloquear um valor público também o retira da consulta, na mesma transação.
        self.connection.execute(
            text(
                """
                UPDATE observacoes_m6
                SET divulgacao_bloqueada = true, motivo_bloqueio = :motivo,
                    status = 'rascunho', publicado_por = NULL, publicado_em = NULL
                WHERE id = :id
                """
            ),
            {"id": observacao_id, "motivo": motivo},
        )

    def desbloquear(self, observacao_id: str) -> None:
        self.connection.execute(
            text(
                """
                UPDATE observacoes_m6 SET divulgacao_bloqueada = false, motivo_bloqueio = NULL
                WHERE id = :id
                """
            ),
            {"id": observacao_id},
        )
