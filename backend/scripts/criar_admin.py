"""Cria ou redefine a conta administrativa de desenvolvimento."""

import argparse
import getpass
import os

from sqlalchemy import create_engine

from app.core.database import get_database_url
from app.core.security import hash_password
from app.repositories.usuario_repository import UsuarioRepository


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--nome", default="Administrador")
    args = parser.parse_args()

    # A senha não é aceita como argumento para não ficar no histórico do shell.
    senha = os.getenv("ADMIN_SENHA") or getpass.getpass("Senha: ")
    if len(senha) < 8:
        parser.error("A senha deve ter pelo menos 8 caracteres.")

    engine = create_engine(get_database_url())
    try:
        with engine.begin() as connection:
            usuario_id = UsuarioRepository(connection).salvar_admin(
                args.nome, args.email.strip(), hash_password(senha)
            )
        print(f"Conta administrativa {args.email} pronta (id {usuario_id}).")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
