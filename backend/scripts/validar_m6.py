"""Executa a conferência local dos dados e, opcionalmente, do PostgreSQL descartável."""

import argparse
from copy import deepcopy
from datetime import date
import importlib.metadata
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
import uuid

from scripts.carregar_m6 import aplicar, validar_banco
from scripts.m6.contrato import carregar_pacote

BACKEND = Path(__file__).resolve().parents[1]


def verificar_postgresql(manifesto, catalogos, registros, evidencias: Path) -> dict:
    import psycopg
    from psycopg import sql
    from alembic import command
    from alembic.config import Config

    nome_banco = os.environ.get("POSTGRES_DB", "")
    if os.environ.get("M6_BANCO_DESCARTAVEL") != "1" or not nome_banco.startswith("c317_m6_validacao"):
        raise ValueError("A validação PostgreSQL exige M6_BANCO_DESCARTAVEL=1 e banco c317_m6_validacao*. Não apontar para a base compartilhada.")
    config = Config(str(BACKEND / "alembic.ini"))
    command.upgrade(config, "head")
    resultado = subprocess.run([sys.executable, "-m", "pytest", "tests", "-q", f"--junitxml={evidencias / 'backend-junit.xml'}"], cwd=BACKEND, text=True, capture_output=True)
    (evidencias / "backend-pytest.txt").write_text(resultado.stdout + resultado.stderr, encoding="utf-8")

    conexao = psycopg.connect(host=os.environ.get("POSTGRES_HOST", "127.0.0.1"), port=int(os.environ.get("POSTGRES_PORT", "5432")), dbname=nome_banco, user=os.environ["POSTGRES_USER"], password=os.environ["POSTGRES_PASSWORD"], connect_timeout=10)
    esquema = "ensaio_m6_" + uuid.uuid4().hex[:12]
    try:
        try:
            validar_banco(conexao, "postgresql")
        except ValueError:
            legado_recusado = True
        else:
            legado_recusado = False
        conexao.rollback()
        conexao.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(esquema)))
        conexao.execute(sql.SQL("SET search_path TO {}").format(sql.Identifier(esquema)))
        proposta = BACKEND.parent / "docs/m6/contrato-importacao.sql"
        conexao.execute(proposta.read_text(encoding="utf-8"))
        conexao.commit()
        primeira = aplicar(conexao, "postgresql", manifesto, catalogos, registros)
        conexao.commit()
        segunda = aplicar(conexao, "postgresql", manifesto, catalogos, registros)
        conexao.commit()
        if primeira["observacoes_criadas"] != len(registros) or segunda["observacoes_criadas"] != 0 or segunda["observacoes_reutilizadas"] != len(registros):
            raise ValueError("Reexecução PostgreSQL inesperada.")
        alterados = deepcopy(registros)
        alterados[-1]["valor"] = "999999"
        try:
            aplicar(conexao, "postgresql", manifesto, catalogos, alterados)
        except ValueError:
            conflito_recusado = True
        else:
            raise ValueError("Sobrescrita inesperada no PostgreSQL.")
        valor = conexao.execute("SELECT valor FROM observacoes_m6 WHERE id = %s", (registros[-1]["id"],)).fetchone()[0]
        from decimal import Decimal
        if valor != Decimal(registros[-1]["valor"]):
            raise ValueError("Valor existente foi alterado.")
        totais = conexao.execute("SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'rascunho') FROM observacoes_m6").fetchone()
        precisao = next(r for r in registros if "." in r["valor"] and len(r["valor"].split(".")[1]) > 10)
        armazenado = conexao.execute("SELECT valor FROM observacoes_m6 WHERE id = %s", (precisao["id"],)).fetchone()[0]
        if armazenado != Decimal(precisao["valor"]):
            raise ValueError("Precisão perdida no PostgreSQL.")
        conexao.commit()
        return {"backend_pytest_exit_code": resultado.returncode, "contrato_legado_recusado": legado_recusado, "primeira_carga": primeira, "segunda_carga": segunda, "conflito_recusado": conflito_recusado, "observacoes_armazenadas": totais[0], "rascunhos": totais[1], "precisao_decimal_preservada": True, "esquema": "descartavel_separado_da_aplicacao", "integracao_dos_novos_dados_na_api": False}
    finally:
        conexao.rollback()
        conexao.execute("SET search_path TO public")
        conexao.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(esquema)))
        conexao.commit()
        conexao.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--postgresql", action="store_true")
    parser.add_argument("--evidencias", type=Path, default=BACKEND / ".execucao-m6/validacao")
    args = parser.parse_args()
    args.evidencias.mkdir(parents=True, exist_ok=True)
    manifesto, catalogos, registros = carregar_pacote(BACKEND / "dados/m6")
    suite = unittest.defaultTestLoader.discover(str(BACKEND / "tests_dados"))
    with (args.evidencias / "dados-unittest.txt").open("w", encoding="utf-8") as log:
        resultado = unittest.TextTestRunner(stream=log, verbosity=2).run(suite)
    resumo = {"data": date.today().isoformat(), "python": sys.version.split()[0], "observacoes": len(registros), "testes_dados": {"executados": resultado.testsRun, "falhas": len(resultado.failures), "erros": len(resultado.errors)}, "novos_dados_integrados_na_aplicacao": False}
    for pacote in ("fastapi", "pydantic", "pydantic-core", "psycopg", "SQLAlchemy", "pytest"):
        try:
            resumo.setdefault("dependencias", {})[pacote] = importlib.metadata.version(pacote)
        except importlib.metadata.PackageNotFoundError:
            pass
    if args.postgresql:
        resumo["postgresql"] = verificar_postgresql(manifesto, catalogos, registros, args.evidencias)
    (args.evidencias / "resultado.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(resumo, ensure_ascii=False, indent=2))
    return 0 if resultado.wasSuccessful() and resumo.get("postgresql", {}).get("backend_pytest_exit_code", 0) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
