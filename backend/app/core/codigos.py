"""Códigos internos de catálogo, no mesmo formato do pacote preparado.

O código é gerado uma única vez, a partir do nome no cadastro, e nunca é
recalculado: renomear um item preserva o código (há códigos do pacote que já
não correspondem ao nome atual, e isso é esperado).
"""

from hashlib import sha256
import re
import unicodedata


def normalizar(valor: str) -> str:
    texto = " ".join(valor.split())
    return "".join(
        c for c in unicodedata.normalize("NFKD", texto.casefold()) if not unicodedata.combining(c)
    )


def gerar_codigo(prefixo: str, nome: str) -> str:
    """`prefixo_slug_hash`, como `i_populacao_682eff3322`."""
    normal = normalizar(nome)
    slug = re.sub(r"[^a-z0-9]+", "_", normal).strip("_")[:60]
    return f"{prefixo}_{slug}_{sha256(normal.encode()).hexdigest()[:10]}"
