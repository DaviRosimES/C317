from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class ErroDominio(Exception):
    """Erro de regra de negócio, convertido em resposta HTTP com {"detail": mensagem}."""

    status_code = 400

    def __init__(self, mensagem: str):
        super().__init__(mensagem)
        self.mensagem = mensagem


class ValidacaoError(ErroDominio):
    status_code = 422


class NaoEncontradoError(ErroDominio):
    status_code = 404


class ConflitoError(ErroDominio):
    status_code = 409


def registrar_handlers(app: FastAPI) -> None:
    @app.exception_handler(ErroDominio)
    async def erro_dominio(_: Request, erro: ErroDominio) -> JSONResponse:
        return JSONResponse(status_code=erro.status_code, content={"detail": erro.mensagem})
