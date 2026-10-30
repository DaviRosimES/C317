"""Regras do contrato c317.m6.v1 compartilhadas pela API e pelos scripts da G4/G5.

A identidade precisa ser a mesma nos dois lados: uma observação cadastrada pela
API e a mesma observação vinda de um pacote não podem virar duas.
"""

from decimal import Decimal, InvalidOperation
from hashlib import sha256
import json


def json_canonico(valor: object) -> str:
    return json.dumps(valor, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def decimal_exato(valor: str) -> str:
    try:
        numero = Decimal(valor)
    except (InvalidOperation, TypeError) as erro:
        raise ValueError("Valor numérico inválido.") from erro
    if not numero.is_finite() or numero < 0:
        raise ValueError("O conjunto recebido exige números finitos e não negativos.")
    return format(numero, "f")


def identidade(observacao: dict) -> str:
    campos = ("indicador_codigo", "territorio_codigo", "categoria_codigo", "referencia", "unidade_codigo", "fonte_codigo")
    return sha256(json_canonico({c: observacao[c] for c in campos}).encode()).hexdigest()
