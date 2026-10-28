from decimal import ROUND_HALF_UP, Decimal


def valor_para_exibicao(valor: Decimal, casas_exibicao: int) -> Decimal:
    """Arredonda somente para apresentação, meio para cima, nas casas da unidade.

    O valor armazenado e devolvido pela API continua exato; nunca grave o
    resultado desta função no lugar do original.
    """
    return valor.quantize(Decimal(1).scaleb(-casas_exibicao), rounding=ROUND_HALF_UP)
