from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

from app.core.dados import normalizar_valor

TipoReferencia = Literal["anual", "mensal", "acumulada", "levantamento", "retrato"]
Qualificador = Literal["igual", "maior_que"]
StatusDado = Literal["rascunho", "publicado"]
Situacao = Literal["ativos", "arquivados", "todos"]

Codigo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Nota = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
Motivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


# Partes compartilhadas


class Referencia(BaseModel):
    """Referência completa do dado. O rótulo é derivado; não é enviado."""

    model_config = ConfigDict(extra="forbid")

    tipo: TipoReferencia
    ano_inicio: int
    ano_fim: int | None = Field(None, description="Obrigatório em acumulada e levantamento; nos demais, igual ao início.")
    mes: int | None = Field(None, description="Somente na referência mensal (1 a 12).")
    data_extracao: date | None = Field(None, description="Somente no retrato.")


class ReferenciaResponse(BaseModel):
    tipo: TipoReferencia
    ano_inicio: int
    ano_fim: int
    mes: int | None
    data_extracao: date | None
    chave: str = Field(description="Chave do Ano/Período (ex.: `anual-2024`, `acumulada-2000-2024`).")
    rotulo: str = Field(description="Rótulo para exibição (ex.: \"2000–2024 — acumulado\").")


class CodigoNome(BaseModel):
    codigo: str
    nome: str


class UnidadeResponse(CodigoNome):
    inteira: bool
    maximo: float | None
    casas_exibicao: int


class CategoriaResponse(CodigoNome):
    classificacao_codigo: str
    classificacao_nome: str
    codigo_cnae: str | None


class FonteResponse(CodigoNome):
    links: list[str]


# Administração


class IndicadorDoDado(CodigoNome):
    arquivado: bool = Field(description="Indicador arquivado oculta o dado sem mudar o estado dele.")


class DadoAdminResponse(BaseModel):
    id: str = Field(description="Identificador estável; preservado em todas as correções.")
    indicador: IndicadorDoDado
    unidade: UnidadeResponse = Field(description="Herdada da definição do indicador.")
    territorio: CodigoNome
    categoria: CategoriaResponse | None
    fonte: FonteResponse
    referencia: ReferenciaResponse
    valor: str = Field(description="Decimal exato como texto.")
    qualificador: Qualificador
    notas: list[str]
    origens: list[dict] = Field(description="Localização documental do valor recebido; vazia em cadastro manual.")
    status: StatusDado
    arquivado: bool
    divulgacao_bloqueada: bool
    motivo_bloqueio: str | None
    demonstracao: bool
    visivel_publicamente: bool = Field(
        description="Publicado, não arquivado, não bloqueado, de indicador ativo e de Santa Rita do Sapucaí."
    )


class _ValorDecimal(BaseModel):
    @field_validator("valor", mode="before", check_fields=False)
    @classmethod
    def _decimal(cls, valor):
        if valor is None:
            return valor
        if not isinstance(valor, str):
            raise ValueError("Envie o valor como texto decimal (ex.: \"44,5\"), nunca como número.")
        return normalizar_valor(valor)


class DadoCreate(_ValorDecimal):
    """Novo dado em rascunho. Território, unidade e setores vêm da definição; não são enviados."""

    model_config = ConfigDict(extra="forbid")

    indicador_codigo: Codigo
    categoria_codigo: Codigo | None = None
    referencia: Referencia
    valor: str = Field(description="Decimal não negativo como texto; aceita vírgula decimal.")
    qualificador: Qualificador = "igual"
    fonte_codigo: Codigo
    notas: list[Nota] = Field(default_factory=list)


class DadoUpdate(_ValorDecimal):
    """Correção parcial que preserva o id. O indicador não muda: outra medida é outro dado."""

    model_config = ConfigDict(extra="forbid")

    categoria_codigo: Codigo | None = None
    referencia: Referencia | None = None
    valor: str | None = None
    qualificador: Qualificador | None = None
    fonte_codigo: Codigo | None = None
    notas: list[Nota] | None = None

    @model_validator(mode="after")
    def _somente_categoria_aceita_null(self):
        for campo in self.model_fields_set - {"categoria_codigo"}:
            if getattr(self, campo) is None:
                raise ValueError(f"{campo} não pode ser removido.")
        return self


class BloqueioRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    motivo: Motivo = Field(description="Motivo concreto (ex.: amostra insuficiente da pesquisa).")
