from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

TipoRelatorio = Literal["relatorio_tecnico", "peca_divulgacao"]


class RelatorioPublicoResponse(BaseModel):
    """Relatório publicado: PDF baixado em /relatorios/{id}/arquivo ou documento em link externo.

    Número, tipo, data e referência são nulos quando a fonte não os informa; não são presumidos.
    """

    id: int
    titulo: str
    numero: str | None = Field(description="Número oficial (ex.: \"004/2025\"), quando existe.")
    tipo: TipoRelatorio | None = Field(
        description="Relatório técnico ou peça de divulgação; nulo quando a fonte não distingue."
    )
    fonte: str
    data_publicacao: date | None
    ano: int | None = Field(description="Ano de referência do relatório.")
    mes: int | None = Field(description="Mês de referência; nulo para relatório anual.")
    link_externo: str | None = Field(
        description="Endereço do documento fora da API; nulo quando o PDF é baixado da API."
    )
    demonstracao: bool = Field(description="Verdadeiro para relatórios fictícios.")
