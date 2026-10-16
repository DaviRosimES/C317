from datetime import date

from pydantic import BaseModel, Field


class RelatorioPublicoResponse(BaseModel):
    """Relatório publicado. O PDF é baixado em /relatorios/{id}/arquivo."""

    id: int
    titulo: str
    fonte: str
    data_publicacao: date
    ano: int = Field(description="Ano de referência do relatório.")
    mes: int | None = Field(description="Mês de referência; nulo para relatório anual.")
    demonstracao: bool = Field(description="Verdadeiro para relatórios fictícios.")
