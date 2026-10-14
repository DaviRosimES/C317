from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

StatusLancamento = Literal["rascunho", "publicado"]

CodigoTipo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Valor = Annotated[Decimal, Field(allow_inf_nan=False, max_digits=18, decimal_places=4)]
Ano = Annotated[int, Field(ge=1900, le=2100)]
Mes = Annotated[int, Field(ge=1, le=12, description="Nulo para um período anual.")]
Fonte = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=1000),
    Field(description="Fonte identificável do valor (base, instituição, referência, URL)."),
]
CodigoCnae = Annotated[
    str,
    StringConstraints(strip_whitespace=True, pattern=r"^[0-9]{4}-[0-9]/[0-9]{2}$"),
    Field(description="Subclasse CNAE; obrigatória para tipos de escopo 'cnae'."),
]

_EXEMPLO = {
    "tipo": "ocupacao_media_hoteis",
    "valor": "68.25",
    "ano": 2026,
    "mes": 9,
    "fonte": "Pesquisa mensal de ocupação hoteleira — Secretaria de Turismo",
    "codigo_cnae": None,
    "estabelecimento_id": None,
    "demonstracao": False,
}


class IndicadorCreate(BaseModel):
    """Lançamento de um valor pronto; é criado como rascunho."""

    model_config = ConfigDict(json_schema_extra={"examples": [_EXEMPLO]})

    tipo: CodigoTipo
    valor: Valor
    ano: Ano
    mes: Mes | None = None
    fonte: Fonte
    codigo_cnae: CodigoCnae | None = None
    estabelecimento_id: int | None = None
    demonstracao: bool = False


class IndicadorUpdate(BaseModel):
    """Correção parcial: apenas os campos enviados são alterados e o lançamento é revalidado."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"valor": "70.1"}]})

    tipo: CodigoTipo | None = None
    valor: Valor | None = None
    ano: Ano | None = None
    mes: Mes | None = None
    fonte: Fonte | None = None
    codigo_cnae: CodigoCnae | None = None
    estabelecimento_id: int | None = None
    demonstracao: bool | None = None

    @model_validator(mode="after")
    def campos_obrigatorios_nao_nulos(self) -> "IndicadorUpdate":
        nulos = [
            campo
            for campo in ("tipo", "valor", "ano", "fonte", "demonstracao")
            if campo in self.model_fields_set and getattr(self, campo) is None
        ]
        if nulos:
            raise ValueError(f"Campos obrigatórios não podem ser nulos: {', '.join(nulos)}.")
        return self


class IndicadorResponse(BaseModel):
    id: int
    tipo: str
    nome: str
    unidade: str
    escopo: str
    valor: Decimal = Field(description="Serializado como string decimal, sem perda de precisão.")
    ano: int
    mes: int | None
    codigo_cnae: str | None
    estabelecimento_id: int | None
    fonte: str
    demonstracao: bool
    status: str
    validado_por: int | None
