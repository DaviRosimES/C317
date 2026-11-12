"""Armazenamento dos PDFs de relatórios na pasta configurada.

Arquivos enviados pela administração ficam em `<relatorios_dir>/enviados/` com nome gerado; o
nome original só serve para apresentação. Os PDFs versionados da demonstração ficam na raiz da
pasta e nunca são removidos por aqui.
"""

from pathlib import Path, PureWindowsPath
from typing import BinaryIO
from uuid import uuid4

from app.core.config import settings
from app.core.errors import ArquivoGrandeDemaisError, ValidacaoError

SUBPASTA = "enviados"
_PEDACO = 1024 * 1024
_MIB = 1024 * 1024


def limite_texto(limite: int | None = None) -> str:
    limite = settings.relatorios_tamanho_maximo if limite is None else limite
    return f"{limite // _MIB} MB" if limite % _MIB == 0 else f"{limite} bytes"


def nome_original(nome: str | None) -> str | None:
    """Só o nome do arquivo, sem pastas (navegadores antigos enviam o caminho completo)."""
    nome = PureWindowsPath(nome or "").name.strip()
    return nome[:255] or None


def salvar(origem: BinaryIO) -> str:
    """Grava e valida o PDF; devolve o caminho relativo à pasta. Nada fica gravado se falhar."""
    pasta = settings.relatorios_dir / SUBPASTA
    pasta.mkdir(parents=True, exist_ok=True)
    nome = f"{uuid4().hex}.pdf"
    parcial = pasta / f".{nome}.parcial"
    limite = settings.relatorios_tamanho_maximo
    try:
        tamanho = 0
        with parcial.open("xb") as destino:
            while pedaco := origem.read(_PEDACO):
                tamanho += len(pedaco)
                if tamanho > limite:
                    raise ArquivoGrandeDemaisError(
                        f"O PDF excede o limite de {limite_texto(limite)}. O conteúdo vigente foi mantido."
                    )
                destino.write(pedaco)
        _validar(parcial, tamanho)
        parcial.rename(pasta / nome)
    except BaseException:
        parcial.unlink(missing_ok=True)
        raise
    return f"{SUBPASTA}/{nome}"


def _validar(caminho: Path, tamanho: int) -> None:
    """Confere o conteúdo (cabeçalho e marcador de fim), não a extensão nem o tipo declarado."""
    if tamanho == 0:
        raise ValidacaoError("O arquivo enviado está vazio. O conteúdo vigente foi mantido.")
    with caminho.open("rb") as arquivo:
        inicio = arquivo.read(1024)
        arquivo.seek(max(0, tamanho - 2048))
        fim = arquivo.read()
    if b"%PDF-" not in inicio or b"%%EOF" not in fim:
        raise ValidacaoError(
            "O arquivo enviado não é um PDF válido. O conteúdo vigente foi mantido."
        )


def resolver(arquivo_url: str | None) -> Path | None:
    """Caminho do PDF existente, sempre dentro da pasta configurada; None se não houver."""
    if arquivo_url is None:
        return None
    pasta = settings.relatorios_dir.resolve()
    caminho = (pasta / arquivo_url).resolve()
    if not caminho.is_relative_to(pasta) or caminho.suffix.lower() != ".pdf" or not caminho.is_file():
        return None
    return caminho


def remover(arquivo_url: str | None) -> None:
    """Apaga um PDF enviado que deixou de ser vigente; os da demonstração são preservados."""
    if arquivo_url is None:
        return
    enviados = (settings.relatorios_dir / SUBPASTA).resolve()
    caminho = (settings.relatorios_dir / arquivo_url).resolve()
    if caminho.is_relative_to(enviados):
        caminho.unlink(missing_ok=True)
