from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

Escopo = Literal["municipal", "cnae"]
Periodicidade = Literal["mensal", "anual"]


class CnaeResponse(BaseModel):
    id: int
    codigo: str
    nome: str
    fonte: str | None = Field(description="Fonte da classificação CNAE.")
    provisorio: bool
    rotas: list[str] = Field(description="Códigos das rotas às quais o CNAE está associado.")


class TipoIndicadorResponse(BaseModel):
    codigo: str
    nome: str
    descricao: str
    unidade: str
    escopo: str
    fonte_referencia: str | None
    provisorio: bool


class RotaResponse(BaseModel):
    codigo: str
    nome: str
    descricao: str
    cnaes: list[str]
    composicao_pendente: bool = Field(description="Verdadeiro enquanto não há CNAEs associados.")


class PeriodoResponse(BaseModel):
    ano: int
    mes: int | None = Field(description="Nulo para referência anual.")


class IndicadorPublicoResponse(BaseModel):
    """Lançamento publicado. A ausência de um registro significa "sem dados", nunca zero."""

    id: int
    tipo: str
    nome: str
    unidade: str
    escopo: str
    valor: Decimal = Field(description="Serializado como string decimal.")
    ano: int
    mes: int | None
    codigo_cnae: str | None
    nome_cnae: str | None
    rotas: list[str]
    fonte: str
    demonstracao: bool = Field(description="Verdadeiro para valores fictícios.")
