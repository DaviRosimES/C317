"""Carga incremental do pacote c317.m7.g8.v2 (definições, catálogos e Dados do indicador).

Sem --aplicar, simula: lê o banco, mostra o que seria inserido, o que já existe, os conflitos e
os arquivamentos previstos, e não grava nada. Com --aplicar, grava em uma única transação.

- Reexecutar não duplica nada nem reinicia publicação, arquivo ou bloqueio.
- Conteúdo do banco que diverge do pacote (por exemplo, já corrigido pela administração) é um
  conflito: a aplicação é recusada. `--manter-banco` é a resolução explícita que mantém a versão
  do banco nos itens em conflito e aplica o restante.
- Dados que existiam na M6 herdam status, bloqueio e arquivo de `observacoes_m6` pelo id;
  dados novos entram em rascunho.
- Os 925 dados não municipais não são importados; se existirem em `observacoes_m6`, são
  arquivados. Os tipos de demonstração do legado são arquivados, sem conversão nem exclusão.
"""

import argparse
import json
import sys
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection
from sqlalchemy.exc import ProgrammingError

from app.core.database import get_database_url
from app.core.dados import problemas_compatibilidade
from scripts.m7.pacote import PASTA, Pacote, PacoteInvalido, identidade_do_pacote, ler


class CargaComConflitos(ValueError):
    pass


# Catálogos na ordem de dependência: (tabela, catálogo do pacote, campos comparados).
_CATALOGOS = (
    ("setores_observatorio", "setores", ("nome",)),
    ("unidades", "unidades", ("nome", "inteira", "maximo", "casas_exibicao")),
    ("fontes", "fontes", ("nome", "links")),
    ("classificacoes", "classificacoes", ("nome",)),
    ("categorias", "categorias", ("nome", "classificacao_codigo", "codigo_cnae")),
    ("territorios", "territorios", ("nome", "tipo")),
)
_COLUNAS_DADO = (
    "indicador_codigo", "territorio_codigo", "categoria_codigo", "fonte_codigo", "referencia_tipo",
    "ano_inicio", "ano_fim", "mes", "data_extracao", "valor", "qualificador", "notas", "origens",
    "demonstracao",
)


@dataclass
class Grupo:
    inserir: list = field(default_factory=list)
    existentes: list = field(default_factory=list)
    conflitos: list = field(default_factory=list)  # (código, motivo)

    def resumo(self) -> dict:
        return {"inserir": len(self.inserir), "existentes": len(self.existentes), "conflitos": len(self.conflitos)}


@dataclass
class Plano:
    catalogos: dict[str, Grupo]
    indicadores: Grupo
    dados: Grupo
    estados_m6: int
    arquivar_m6: list[str]
    m6_ja_arquivados: int
    arquivar_legado: list[str]
    legado: Grupo
    pacote: Pacote

    def conflitos(self) -> list[str]:
        grupos = [*self.catalogos.items(), ("indicadores", self.indicadores), ("dados", self.dados), ("legado", self.legado)]
        return [f"{nome}/{codigo}: {motivo}" for nome, grupo in grupos for codigo, motivo in grupo.conflitos]

    def resumo(self, modo: str) -> dict:
        return {
            "modo": modo,
            "contrato": self.pacote.manifesto["contrato"],
            "catalogos": {nome: grupo.resumo() for nome, grupo in self.catalogos.items()},
            "indicadores": self.indicadores.resumo(),
            "associacoes_indicador_setor": len(self.pacote.associacoes),
            "dados": {
                **self.dados.resumo(),
                "estados_preservados_da_m6": self.estados_m6,
                "novos_em_rascunho": len(self.dados.inserir) - self.estados_m6,
            },
            "arquivamentos_previstos": {
                "dados_nao_municipais_m6": len(self.arquivar_m6),
                "dados_nao_municipais_m6_ja_arquivados": self.m6_ja_arquivados,
                "dados_nao_municipais_nao_importados": len(self.pacote.retirados),
                "tipos_demonstracao_legado": len(self.arquivar_legado),
            },
            "exclusoes_respeitadas": self.pacote.exclusoes,
            "conflitos": self.conflitos(),
        }


def _q(connection: Connection, sql: str, parametros: dict | None = None):
    return connection.execute(text(sql), parametros or {})


def _igual(atual, esperado) -> bool:
    """Compara valores do banco e do pacote; números (ex.: `maximo`) pelo valor decimal."""
    if isinstance(atual, Decimal) or isinstance(esperado, float):
        if atual is None or esperado is None:
            return atual is None and esperado is None
        return Decimal(str(atual)) == Decimal(str(esperado))
    return atual == esperado


def _item_catalogo(catalogo: str, item: dict) -> dict:
    if catalogo == "categorias":
        return {**item, "classificacao_codigo": item["classificacao"]}
    return item


def _planejar_catalogo(connection: Connection, tabela: str, itens: dict, campos: tuple) -> Grupo:
    grupo = Grupo()
    colunas = ", ".join(("codigo", *campos))
    banco = {linha.codigo: linha._mapping for linha in _q(connection, f"SELECT {colunas} FROM {tabela}")}
    # Nomes únicos (sem diferenciar maiúsculas); categorias, dentro da classificação.
    escopo = "classificacao_codigo" if tabela == "categorias" else None
    nomes = {
        ((linha[escopo] if escopo else None), linha["nome"].strip().lower()): codigo for codigo, linha in banco.items()
    }
    for codigo, item in itens.items():
        atual = banco.get(codigo)
        if atual is None:
            dono = nomes.get(((item[escopo] if escopo else None), item["nome"].strip().lower()))
            if dono is not None:
                grupo.conflitos.append((codigo, f"nome já usado por {dono}"))
            else:
                grupo.inserir.append(item)
        elif all(_igual(atual[campo], item[campo]) for campo in campos):
            grupo.existentes.append(codigo)
        else:
            diferentes = [campo for campo in campos if not _igual(atual[campo], item[campo])]
            grupo.conflitos.append((codigo, f"banco diverge do pacote em {', '.join(diferentes)}"))
    return grupo


def _planejar_indicadores(connection: Connection, indicadores: dict) -> Grupo:
    grupo = Grupo()
    banco = {
        linha.codigo: linha
        for linha in _q(
            connection,
            """
            SELECT d.codigo, d.nome, d.definicao, d.unidade_codigo, d.tipos_referencia_permitidos,
                   d.aceita_sem_categoria, d.nota_metodologica,
                   ARRAY(SELECT setor_codigo FROM indicador_setores WHERE indicador_codigo = d.codigo) AS setores,
                   ARRAY(SELECT classificacao_codigo FROM indicador_classificacoes
                         WHERE indicador_codigo = d.codigo) AS classificacoes_permitidas
            FROM indicadores_definicoes d
            """,
        )
    }
    nomes = {linha.nome.strip().lower(): codigo for codigo, linha in banco.items()}
    for codigo, item in indicadores.items():
        atual = banco.get(codigo)
        if atual is None:
            dono = nomes.get(item["nome"].strip().lower())
            if dono is not None:
                grupo.conflitos.append((codigo, f"nome já usado por {dono}"))
            else:
                grupo.inserir.append(item)
            continue
        diferentes = [
            campo
            for campo in ("nome", "definicao", "unidade_codigo", "aceita_sem_categoria", "nota_metodologica")
            if getattr(atual, campo) != item[campo]
        ]
        for campo in ("tipos_referencia_permitidos", "setores", "classificacoes_permitidas"):
            if set(getattr(atual, campo)) != set(item[campo]):
                diferentes.append(campo)
        if diferentes:
            grupo.conflitos.append((codigo, f"banco diverge do pacote em {', '.join(diferentes)}"))
        else:
            grupo.existentes.append(codigo)
    return grupo


def _linha_dado(dado: dict) -> dict:
    referencia = dado["referencia"]
    return {
        "id": dado["id"],
        "indicador_codigo": dado["indicador_codigo"],
        "territorio_codigo": dado["territorio_codigo"],
        "categoria_codigo": dado["categoria_codigo"],
        "fonte_codigo": dado["fonte_codigo"],
        "referencia_tipo": referencia["tipo"],
        "ano_inicio": referencia["ano_inicio"],
        "ano_fim": referencia["ano_fim"],
        "mes": referencia["mes"],
        "data_extracao": date.fromisoformat(referencia["data_extracao"]) if referencia.get("data_extracao") else None,
        "valor": dado["valor"],
        "qualificador": dado["qualificador"],
        "notas": dado["notas"],
        "origens": dado["origens"],
        "demonstracao": dado["demonstracao"],
    }


def _planejar_dados(connection: Connection, pacote: Pacote) -> tuple[Grupo, int]:
    grupo, estados_m6 = Grupo(), 0
    banco = {
        linha.id: linha._mapping
        for linha in _q(
            connection,
            f"SELECT id, {', '.join(c for c in _COLUNAS_DADO if c != 'valor')}, valor::text AS valor "
            "FROM dados_indicadores",
        )
    }
    identidades = {
        identidade_do_pacote(
            {
                **linha,
                "referencia": {
                    "tipo": linha["referencia_tipo"], "ano_inicio": linha["ano_inicio"],
                    "ano_fim": linha["ano_fim"], "mes": linha["mes"],
                    "data_extracao": linha["data_extracao"] and linha["data_extracao"].isoformat(),
                },
            }
        ): codigo
        for codigo, linha in banco.items()
    }
    m6 = {
        linha.id: linha._mapping
        for linha in _q(
            connection,
            "SELECT id, status, arquivado, divulgacao_bloqueada, motivo_bloqueio FROM observacoes_m6 "
            "WHERE id = ANY(:ids)",
            {"ids": list(pacote.mapeamento.values())},
        )
    }
    for dado in pacote.dados:
        esperado = _linha_dado(dado)
        atual = banco.get(dado["id"])
        if atual is not None:
            diferentes = [c for c in _COLUNAS_DADO if atual[c] != esperado[c]]
            if diferentes:
                grupo.conflitos.append((dado["id"], f"banco diverge do pacote em {', '.join(diferentes)}"))
            else:
                grupo.existentes.append(dado["id"])
            continue
        outro = identidades.get(identidade_do_pacote(dado))
        if outro is not None:
            grupo.conflitos.append((dado["id"], f"a mesma combinação já existe no dado {outro}"))
            continue
        # Estado do banco pelo identificador estável; o pacote não define estados.
        anterior = m6.get(pacote.mapeamento[dado["id"]])
        if anterior is not None:
            estados_m6 += 1
            estado = dict(anterior)
            estado.pop("id")
        else:
            estado = {"status": "rascunho", "arquivado": False, "divulgacao_bloqueada": False, "motivo_bloqueio": None}
        grupo.inserir.append({**esperado, **estado})
    return grupo, estados_m6


def _planejar_legado(connection: Connection, codigos: list[str]) -> tuple[Grupo, list[str]]:
    grupo, arquivar = Grupo(), []
    for codigo in codigos:
        tipo = _q(
            connection,
            """
            SELECT t.arquivado, t.provisorio,
                   (SELECT count(*) FROM indicadores i WHERE i.tipo = t.codigo AND NOT i.demonstracao) AS reais
            FROM tipos_indicadores t WHERE t.codigo = :codigo
            """,
            {"codigo": codigo},
        ).one_or_none()
        if tipo is None or tipo.arquivado:
            grupo.existentes.append(codigo)
        elif tipo.reais or not tipo.provisorio:
            # Divergência da condição de demonstração declarada: não sobrescrever nem arquivar.
            grupo.conflitos.append(
                (codigo, f"{tipo.reais} lançamentos sem marca de demonstração ou tipo não provisório")
            )
        else:
            arquivar.append(codigo)
    return grupo, arquivar


def planejar(connection: Connection, pacote: Pacote) -> Plano:
    """Compara o pacote com o banco sem gravar nada."""
    catalogos = {
        catalogo: _planejar_catalogo(
            connection, tabela, {c: _item_catalogo(catalogo, i) for c, i in pacote.catalogos[catalogo].items()}, campos
        )
        for tabela, catalogo, campos in _CATALOGOS
    }
    dados, estados_m6 = _planejar_dados(connection, pacote)
    retirados = _q(
        connection,
        "SELECT id, arquivado FROM observacoes_m6 WHERE id = ANY(:ids)",
        {"ids": pacote.retirados},
    ).all()
    legado, arquivar_legado = _planejar_legado(connection, pacote.legado_demonstracao)
    return Plano(
        catalogos=catalogos,
        indicadores=_planejar_indicadores(connection, pacote.catalogos["indicadores"]),
        dados=dados,
        estados_m6=estados_m6,
        arquivar_m6=[linha.id for linha in retirados if not linha.arquivado],
        m6_ja_arquivados=sum(linha.arquivado for linha in retirados),
        arquivar_legado=arquivar_legado,
        legado=legado,
        pacote=pacote,
    )


_INSERIR = {
    "setores_observatorio": "INSERT INTO setores_observatorio (codigo, nome) VALUES (:codigo, :nome)",
    "unidades": "INSERT INTO unidades (codigo, nome, inteira, maximo, casas_exibicao) "
    "VALUES (:codigo, :nome, :inteira, :maximo, :casas_exibicao)",
    "fontes": "INSERT INTO fontes (codigo, nome, links) VALUES (:codigo, :nome, :links)",
    "classificacoes": "INSERT INTO classificacoes (codigo, nome) VALUES (:codigo, :nome)",
    "categorias": "INSERT INTO categorias (codigo, nome, classificacao_codigo, codigo_cnae) "
    "VALUES (:codigo, :nome, :classificacao_codigo, :codigo_cnae)",
    "territorios": "INSERT INTO territorios (codigo, nome, tipo) VALUES (:codigo, :nome, :tipo)",
}


def aplicar(connection: Connection, plano: Plano, manter_banco: bool = False) -> dict:
    """Grava o plano. Recusa tudo se houver conflito, salvo a resolução explícita `manter_banco`."""
    conflitos = plano.conflitos()
    if conflitos and not manter_banco:
        raise CargaComConflitos(
            f"{len(conflitos)} conflito(s) com o banco; nada foi gravado. Revise os itens ou use "
            "--manter-banco para manter a versão do banco neles: " + "; ".join(conflitos[:10])
        )
    with connection.begin_nested():
        for tabela, catalogo, _ in _CATALOGOS:
            for item in plano.catalogos[catalogo].inserir:
                _q(connection, _INSERIR[tabela], item)
        for item in plano.indicadores.inserir:
            _q(
                connection,
                """
                INSERT INTO indicadores_definicoes
                    (codigo, nome, definicao, unidade_codigo, tipos_referencia_permitidos,
                     aceita_sem_categoria, nota_metodologica)
                VALUES (:codigo, :nome, :definicao, :unidade_codigo, :tipos_referencia_permitidos,
                        :aceita_sem_categoria, :nota_metodologica)
                """,
                item,
            )
            _q(
                connection,
                "INSERT INTO indicador_setores SELECT :codigo, unnest(CAST(:setores AS text[]))",
                item,
            )
            _q(
                connection,
                "INSERT INTO indicador_classificacoes SELECT :codigo, unnest(CAST(:classificacoes_permitidas AS text[]))",
                item,
            )
        for linha in plano.dados.inserir:
            _conferir_no_banco(connection, linha)
            _q(
                connection,
                """
                INSERT INTO dados_indicadores
                    (id, indicador_codigo, territorio_codigo, categoria_codigo, fonte_codigo,
                     referencia_tipo, ano_inicio, ano_fim, mes, data_extracao, valor, qualificador,
                     notas, origens, demonstracao, status, arquivado, divulgacao_bloqueada,
                     motivo_bloqueio)
                VALUES (:id, :indicador_codigo, :territorio_codigo, :categoria_codigo, :fonte_codigo,
                        :referencia_tipo, :ano_inicio, :ano_fim, :mes, :data_extracao,
                        CAST(:valor AS numeric), :qualificador, :notas, CAST(:origens AS jsonb),
                        :demonstracao, :status, :arquivado, :divulgacao_bloqueada, :motivo_bloqueio)
                """,
                {**linha, "origens": json.dumps(linha["origens"], ensure_ascii=False)},
            )
        if plano.arquivar_m6:
            _q(connection, "UPDATE observacoes_m6 SET arquivado = true WHERE id = ANY(:ids)", {"ids": plano.arquivar_m6})
        if plano.arquivar_legado:
            _q(
                connection,
                "UPDATE tipos_indicadores SET arquivado = true WHERE codigo = ANY(:codigos)",
                {"codigos": plano.arquivar_legado},
            )
    return plano.resumo("aplicada")


def _conferir_no_banco(connection: Connection, linha: dict) -> None:
    """Com --manter-banco, a versão do banco de um catálogo pode diferir da do pacote."""
    regra = _q(
        connection,
        """
        SELECT d.tipos_referencia_permitidos, d.aceita_sem_categoria,
               ARRAY(SELECT classificacao_codigo FROM indicador_classificacoes
                     WHERE indicador_codigo = d.codigo) AS classificacoes_permitidas,
               u.nome, u.inteira, u.maximo,
               (SELECT classificacao_codigo FROM categorias WHERE codigo = :categoria) AS classificacao
        FROM indicadores_definicoes d JOIN unidades u ON u.codigo = d.unidade_codigo
        WHERE d.codigo = :indicador
        """,
        {"indicador": linha["indicador_codigo"], "categoria": linha["categoria_codigo"]},
    ).one()
    problemas = problemas_compatibilidade(
        valor=linha["valor"],
        referencia_tipo=linha["referencia_tipo"],
        categoria_classificacao=regra.classificacao,
        sem_categoria=linha["categoria_codigo"] is None,
        indicador=regra._mapping,
        unidade={"nome": regra.nome, "inteira": regra.inteira, "maximo": regra.maximo},
    )
    if problemas:
        raise CargaComConflitos(f"dado {linha['id']} incompatível com a versão do banco: {' '.join(problemas)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pacote", type=Path, default=PASTA)
    parser.add_argument("--aplicar", action="store_true", help="Grava no banco; sem a flag, só simula.")
    parser.add_argument(
        "--manter-banco", action="store_true", help="Resolve conflitos mantendo a versão do banco nos itens divergentes."
    )
    args = parser.parse_args()
    try:
        pacote = ler(args.pacote)
        engine = create_engine(get_database_url())
        with engine.connect() as connection:
            with connection.begin() as transacao:
                plano = planejar(connection, pacote)
                if args.aplicar:
                    resumo = aplicar(connection, plano, args.manter_banco)
                else:
                    resumo = plano.resumo("simulacao_sem_gravacao")
                    transacao.rollback()
        print(json.dumps(resumo, ensure_ascii=False, indent=2))
        return 0
    except ProgrammingError as erro:
        print(
            f"Carga recusada: o banco não tem o esquema esperado ({erro.orig}). "
            "Execute `python -m alembic upgrade head` antes da carga.",
            file=sys.stderr,
        )
        return 2
    except (PacoteInvalido, CargaComConflitos, ValueError, OSError) as erro:
        print(f"Carga recusada: {erro}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
