"""Valida a carga offline, ensaia em SQLite ou aplica no contrato PostgreSQL da V5."""

import argparse
from decimal import Decimal
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import sqlite3
import sys

from scripts.m6.contrato import carregar_pacote, json_canonico

BACKEND = Path(__file__).resolve().parents[1]
COLUNAS = {
    "catalogos_m6": {"tipo", "codigo", "conteudo"},
    "observacoes_m6": {"id", "valor", "conteudo", "status", "demonstracao"},
    "cargas_m6": {"hash_pacote", "sha256_origem", "quantidade"},
}
APLICACAO_SQLITE = 0x03170600


def executar(conexao, dialeto: str, sql: str, parametros: dict | None = None):
    if dialeto == "postgresql":
        sql = re.sub(r":([a-zA-Z_][a-zA-Z_0-9]*)", r"%(\1)s", sql)
    return conexao.execute(sql, parametros or {})


def documento(valor):
    return json.loads(valor) if isinstance(valor, str) else valor


def validar_banco(conexao, dialeto: str) -> None:
    for tabela, esperadas in COLUNAS.items():
        if dialeto == "sqlite":
            colunas = {r[1]: r[2].lower() for r in conexao.execute(f"PRAGMA table_info({tabela})")}
        else:
            linhas = executar(conexao, dialeto, "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = :tabela", {"tabela": tabela}).fetchall()
            colunas = dict(linhas)
        if not esperadas.issubset(colunas):
            raise ValueError(f"Banco incompatível com a carga M6: falta o contrato de {tabela}. Aguardar a migração V5; nenhuma tabela será criada pelo carregador PostgreSQL.")
        if dialeto == "postgresql" and "conteudo" in colunas and colunas["conteudo"] != "jsonb":
            raise ValueError("O contrato PostgreSQL exige conteudo JSONB.")
        if dialeto == "postgresql" and tabela == "observacoes_m6":
            if colunas["valor"] != "numeric":
                raise ValueError("O valor exige NUMERIC, sem conversão para ponto flutuante.")
            escala = executar(conexao, dialeto, "SELECT numeric_scale FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'observacoes_m6' AND column_name = 'valor'").fetchone()[0]
            if escala is not None:
                raise ValueError("O contrato de carga exige NUMERIC sem escala fixa, preservando a precisão original.")


def adaptar_json(valor: dict, dialeto: str):
    if dialeto == "postgresql":
        from psycopg.types.json import Jsonb
        return Jsonb(valor)
    return json_canonico(valor)


def aplicar(conexao, dialeto: str, manifesto: dict, catalogos: dict, observacoes: list[dict]) -> dict:
    """Uma transação do chamador; conflito reverte todo o lote ao savepoint."""
    validar_banco(conexao, dialeto)
    executar(conexao, dialeto, "SAVEPOINT carga_m6")
    criadas = reutilizadas = catalogos_criados = 0
    try:
        # Concorrência no PostgreSQL não pode produzir verificação e inserção conflitantes.
        if dialeto == "postgresql":
            executar(conexao, dialeto, "SELECT pg_advisory_xact_lock(317006)")
        for tipo, itens in catalogos.items():
            for cod, conteudo in itens.items():
                atual = executar(conexao, dialeto, "SELECT conteudo FROM catalogos_m6 WHERE tipo = :tipo AND codigo = :codigo", {"tipo": tipo, "codigo": cod}).fetchone()
                if atual:
                    if json_canonico(documento(atual[0])) != json_canonico(conteudo):
                        raise ValueError(f"Conflito no catálogo {tipo}/{cod}; nenhuma correção existente será sobrescrita.")
                else:
                    executar(conexao, dialeto, "INSERT INTO catalogos_m6 (tipo, codigo, conteudo) VALUES (:tipo, :codigo, :conteudo)", {"tipo": tipo, "codigo": cod, "conteudo": adaptar_json(conteudo, dialeto)})
                    catalogos_criados += 1
        for registro in observacoes:
            atual = executar(conexao, dialeto, "SELECT conteudo, valor FROM observacoes_m6 WHERE id = :id", {"id": registro["id"]}).fetchone()
            if atual:
                if json_canonico(documento(atual[0])) != json_canonico(registro) or Decimal(str(atual[1])) != Decimal(registro["valor"]):
                    raise ValueError(f"Conflito na observação {registro['id']}; definir a atualização antes de carregar novamente.")
                reutilizadas += 1
            else:
                valor = Decimal(registro["valor"]) if dialeto == "postgresql" else registro["valor"]
                executar(conexao, dialeto, "INSERT INTO observacoes_m6 (id, valor, conteudo, status, demonstracao) VALUES (:id, :valor, :conteudo, 'rascunho', :demonstracao)", {"id": registro["id"], "valor": valor, "conteudo": adaptar_json(registro, dialeto), "demonstracao": False})
                criadas += 1
        hash_pacote = sha256(json_canonico(manifesto).encode()).hexdigest()
        existente = executar(conexao, dialeto, "SELECT quantidade FROM cargas_m6 WHERE hash_pacote = :hash", {"hash": hash_pacote}).fetchone()
        if existente is None:
            executar(conexao, dialeto, "INSERT INTO cargas_m6 (hash_pacote, sha256_origem, quantidade) VALUES (:hash, :origem, :quantidade)", {"hash": hash_pacote, "origem": manifesto["origem"]["sha256"], "quantidade": len(observacoes)})
        elif existente[0] != len(observacoes):
            raise ValueError("Histórico da carga inconsistente.")
        executar(conexao, dialeto, "RELEASE SAVEPOINT carga_m6")
    except Exception:
        executar(conexao, dialeto, "ROLLBACK TO SAVEPOINT carga_m6")
        executar(conexao, dialeto, "RELEASE SAVEPOINT carga_m6")
        raise
    return {"observacoes_criadas": criadas, "observacoes_reutilizadas": reutilizadas, "catalogos_criados": catalogos_criados, "carga_ja_registrada": existente is not None, "status_dos_novos_registros": "rascunho"}


def abrir_ensaio(caminho: Path):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    conexao = sqlite3.connect(caminho)
    conexao.execute("PRAGMA busy_timeout = 10000")
    dono = conexao.execute("PRAGMA application_id").fetchone()[0]
    tabelas = conexao.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
    if dono != APLICACAO_SQLITE and tabelas:
        conexao.close()
        raise ValueError("Arquivo SQLite não pertence ao ensaio M6; nenhuma tabela foi alterada.")
    conexao.execute(f"PRAGMA application_id = {APLICACAO_SQLITE}")
    conexao.executescript("""
        CREATE TABLE IF NOT EXISTS catalogos_m6 (
            tipo TEXT NOT NULL, codigo TEXT NOT NULL, conteudo TEXT NOT NULL,
            PRIMARY KEY (tipo, codigo)
        );
        CREATE TABLE IF NOT EXISTS observacoes_m6 (
            id TEXT PRIMARY KEY, valor TEXT NOT NULL, conteudo TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('rascunho', 'publicado')),
            demonstracao BOOLEAN NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS cargas_m6 (
            hash_pacote TEXT PRIMARY KEY, sha256_origem TEXT NOT NULL,
            quantidade INTEGER NOT NULL
        );
    """)
    conexao.commit()
    return conexao


def abrir_postgres():
    try:
        import psycopg
        from dotenv import load_dotenv
    except ImportError as erro:
        raise ValueError("Instale as dependências do backend em um ambiente virtual compatível antes de acessar o PostgreSQL.") from erro
    load_dotenv(BACKEND.parent / ".env")
    if os.getenv("M6_DATABASE_URL"):
        return psycopg.connect(os.environ["M6_DATABASE_URL"])
    return psycopg.connect(host=os.getenv("POSTGRES_HOST", "127.0.0.1"), port=int(os.getenv("POSTGRES_PORT", "5432")), dbname=os.environ["POSTGRES_DB"], user=os.environ["POSTGRES_USER"], password=os.environ["POSTGRES_PASSWORD"], connect_timeout=10)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pacote", type=Path, default=BACKEND / "dados/m6")
    modo = parser.add_mutually_exclusive_group()
    modo.add_argument("--simular", action="store_true", help="Padrão: conferir arquivos, sem conexão com banco.")
    modo.add_argument("--ensaio-sqlite", type=Path, help="Gravar um ensaio isolado; não integra a aplicação.")
    modo.add_argument("--conferir-banco", action="store_true", help="Conferir o contrato da V5, sem gravar dados.")
    modo.add_argument("--aplicar", action="store_true", help="Gravar no PostgreSQL somente após V5.")
    parser.add_argument("--confirmar-carga-real", action="store_true")
    args = parser.parse_args()
    conexao = None
    try:
        manifesto, catalogos, observacoes = carregar_pacote(args.pacote)
        if args.aplicar and not args.confirmar_carga_real:
            raise ValueError("A gravação PostgreSQL exige --aplicar --confirmar-carga-real.")
        if args.ensaio_sqlite:
            conexao = abrir_ensaio(args.ensaio_sqlite)
            conexao.execute("BEGIN")
            resultado = aplicar(conexao, "sqlite", manifesto, catalogos, observacoes)
            conexao.commit()
            resultado["modo"] = "ensaio_sqlite_sem_integracao_com_a_aplicacao"
        elif args.aplicar or args.conferir_banco:
            conexao = abrir_postgres()
            if args.conferir_banco:
                validar_banco(conexao, "postgresql")
                conexao.rollback()
                resultado = {"modo": "contrato_postgresql_conferido_sem_gravacao"}
            else:
                resultado = aplicar(conexao, "postgresql", manifesto, catalogos, observacoes)
                conexao.commit()
                resultado["modo"] = "carga_postgresql_em_rascunho"
        else:
            resultado = {"modo": "validacao_offline_sem_banco", "observacoes_validadas": len(observacoes), "excluidas_da_planilha": manifesto["linhas_indicadores_excluidas"], "integracao_postgresql_verificada": False}
        print(json.dumps(resultado, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, OSError, KeyError) as erro:
        if conexao:
            conexao.rollback()
        print(f"Carga recusada: {erro}", file=sys.stderr)
        return 2
    except Exception as erro:
        if conexao:
            conexao.rollback()
        print(f"Falha ao executar a carga ({type(erro).__name__}); transação revertida. Verifique o ambiente e a dependência V5.", file=sys.stderr)
        return 2
    finally:
        if conexao:
            conexao.close()


if __name__ == "__main__":
    raise SystemExit(main())
