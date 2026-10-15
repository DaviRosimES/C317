import argparse
import getpass
import os

from sqlalchemy import create_engine

from app.core.database import get_database_url
from app.core.security import hash_password
from app.repositories.usuario_repository import UsuarioRepository


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cria ou redefine uma conta de desenvolvimento com o papel informado."
    )
    parser.add_argument("--email", required=True)
    parser.add_argument("--nome", required=True)
    parser.add_argument("--papel", default="parceiro")
    args = parser.parse_args()

    senha = os.getenv("USUARIO_SENHA") or getpass.getpass("Senha: ")
    if len(senha) < 8:
        parser.error("A senha deve ter pelo menos 8 caracteres.")

    engine = create_engine(get_database_url())
    try:
        with engine.begin() as connection:
            usuario_id = UsuarioRepository(connection).salvar(
                args.nome, args.email.strip(), hash_password(senha), args.papel.strip()
            )
        print(f"Conta {args.email} ({args.papel}) pronta (id {usuario_id}).")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
