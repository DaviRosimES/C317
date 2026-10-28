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
    # O CNAE pode estar na observação ou na categoria do recorte.
    "codigos_cnae": """(
        conteudo->>'codigo_cnae' = ANY(:codigos_cnae)
        OR categoria_codigo IN (
            SELECT codigo FROM catalogos_m6
            WHERE tipo = 'categorias' AND conteudo->>'codigo_cnae' = ANY(:codigos_cnae)
        )
    )""",
    "referencia_tipos": "referencia_tipo = ANY(:referencia_tipos)",
    # Um ano só seleciona referências pontuais daquele ano: o acumulado 2000–2024
    # não aparece como dado de 2024.
    "ano": "ano_inicio = :ano AND ano_fim = :ano",
    # Intervalo: referências inteiramente contidas entre ano_inicio e ano_fim.
    "ano_inicio": "ano_inicio >= :ano_inicio",
    "ano_fim": "ano_fim <= :ano_fim",
    "mes": "mes = :mes",
    "status": "status = :status",
    "divulgacao_bloqueada": "divulgacao_bloqueada = :divulgacao_bloqueada",
}

_TIPOS_USADOS = """
    SELECT 'indicadores' AS tipo, indicador_codigo AS codigo FROM observacoes_m6 o WHERE {filtro}
    UNION SELECT 'territorios', territorio_codigo FROM observacoes_m6 o WHERE {filtro}
    UNION SELECT 'unidades', unidade_codigo FROM observacoes_m6 o WHERE {filtro}
    UNION SELECT 'fontes', fonte_codigo FROM observacoes_m6 o WHERE {filtro}
    UNION SELECT 'categorias', categoria_codigo FROM observacoes_m6 o
          WHERE categoria_codigo IS NOT NULL AND {filtro}
    UNION SELECT 'temas', jsonb_array_elements_text(conteudo->'temas') FROM observacoes_m6 o
          WHERE {filtro}
"""


class ObservacaoRepository:
    def __init__(self, connection: Connection):
        self.connection = connection

    # Catálogos

    def itens_catalogo(self, pares: set[tuple[str, str]]) -> dict[str, dict[str, dict]]:
        """Somente os itens pedidos, por (tipo, código)."""
        catalogos: dict[str, dict[str, dict]] = {}
        if not pares:
            return catalogos
        tipos, codigos = zip(*sorted(pares))
        for linha in self.connection.execute(
            text(
                """
                SELECT c.tipo, c.codigo, c.conteudo
                FROM catalogos_m6 c
                JOIN unnest(CAST(:tipos AS text[]), CAST(:codigos AS text[])) AS p (tipo, codigo)
                  ON p.tipo = c.tipo AND p.codigo = c.codigo
                """
            ),
            {"tipos": list(tipos), "codigos": list(codigos)},
        ):
            catalogos.setdefault(linha.tipo, {})[linha.codigo] = linha.conteudo
        return catalogos

    def catalogo_completo(self) -> list[Row]:
        return list(
            self.connection.execute(
                text(
                    f"""
                    SELECT c.tipo, c.codigo, c.conteudo, (u.codigo IS NOT NULL) AS com_dados_publicados
                    FROM catalogos_m6 c
                    LEFT JOIN ({_TIPOS_USADOS.format(filtro=_PUBLICAS)}) u
                      ON u.tipo = c.tipo AND u.codigo = c.codigo
                    ORDER BY c.tipo, c.conteudo->>'nome', c.codigo
                    """
                )
            )
        )

    def catalogo_publico(self) -> list[Row]:
        """Apenas itens usados por observações públicas: nada só de rascunho ou bloqueado."""
        return list(
            self.connection.execute(
                text(
                    f"""
                    SELECT c.tipo, c.codigo, c.conteudo, true AS com_dados_publicados
                    FROM catalogos_m6 c
                    JOIN ({_TIPOS_USADOS.format(filtro=_PUBLICAS)}) u
                      ON u.tipo = c.tipo AND u.codigo = c.codigo
                    ORDER BY c.tipo, c.conteudo->>'nome', c.codigo
                    """
                )
            )
        )

    def categorias_da_classificacao(self, classificacoes: list[str]) -> list[str]:
        return list(
            self.connection.execute(
                text(
                    """
                    SELECT codigo FROM catalogos_m6
                    WHERE tipo = 'categorias' AND conteudo->>'classificacao' = ANY(:classificacoes)
                    """
                ),
                {"classificacoes": classificacoes},
            ).scalars()
        )

    def classificacoes_existentes(self, classificacoes: list[str]) -> set[str]:
        return set(
            self.connection.execute(
                text(
                    """
                    SELECT DISTINCT conteudo->>'classificacao' FROM catalogos_m6
                    WHERE tipo = 'categorias' AND conteudo->>'classificacao' = ANY(:classificacoes)
                    """
                ),
                {"classificacoes": classificacoes},
            ).scalars()
        )

    # Observações

    def listar(
        self, filtros: dict, somente_publicas: bool, limite: int, deslocamento: int
    ) -> tuple[list[Row], int]:
        condicoes = [_PUBLICAS] if somente_publicas else []
        parametros = {"limite": limite, "deslocamento": deslocamento}
        for nome, valor in filtros.items():
            if valor is None or valor == []:
                continue
            condicoes.append(_FILTROS[nome])
            parametros[nome] = valor
        where = f"WHERE {' AND '.join(condicoes)}" if condicoes else ""
        total = self.connection.execute(
            text(f"SELECT count(*) FROM observacoes_m6 {where}"), parametros
        ).scalar_one()
        linhas = list(
            self.connection.execute(
                text(
                    f"""
                    SELECT {_COLUNAS} FROM observacoes_m6 {where}
                    ORDER BY indicador_codigo, territorio_codigo, categoria_codigo NULLS FIRST,
                             ano_inicio, ano_fim, mes NULLS FIRST, id
                    LIMIT :limite OFFSET :deslocamento
                    """
                ),
                parametros,
            )
        )
        return linhas, total

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

    def atualizar_conteudo(self, observacao_id: str, conteudo: dict) -> None:
        # Quem publicou e quando não mudam: a correção fica registrada no histórico.
        self.connection.execute(
            text(
                """
                UPDATE observacoes_m6
                SET valor = CAST(:valor AS numeric), conteudo = CAST(:conteudo AS jsonb)
                WHERE id = :id
                """
            ),
            {"id": observacao_id, "valor": conteudo["valor"], "conteudo": json.dumps(conteudo)},
        )

    def publicar(self, observacao_id: str, admin_id: int) -> bool:
        """Publica; devolve False se já estava publicada (nada muda)."""
        return self.connection.execute(
            text(
                """
                UPDATE observacoes_m6
                SET status = 'publicado', publicado_por = :admin, publicado_em = now()
                WHERE id = :id AND status <> 'publicado'
                """
            ),
            {"id": observacao_id, "admin": admin_id},
        ).rowcount == 1

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

    # Histórico

    def registrar(
        self, observacao_id: str, evento: str, usuario_id: int, detalhes: dict | None = None
    ) -> None:
        self.connection.execute(
            text(
                """
                INSERT INTO historico_observacoes_m6 (observacao_id, evento, usuario_id, detalhes)
                VALUES (:id, :evento, :usuario, CAST(:detalhes AS jsonb))
                """
            ),
            {
                "id": observacao_id,
                "evento": evento,
                "usuario": usuario_id,
                "detalhes": json.dumps(detalhes or {}, default=str),
            },
        )

    def historico(self, observacao_id: str) -> list[Row]:
        return list(
            self.connection.execute(
                text(
                    """
                    SELECT evento, usuario_id, registrado_em, detalhes
                    FROM historico_observacoes_m6 WHERE observacao_id = :id
                    ORDER BY registrado_em, id
                    """
                ),
                {"id": observacao_id},
            )
        )
