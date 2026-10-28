from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

TipoReferencia = Literal["anual", "mensal", "acumulada", "levantamento", "retrato"]
Qualificador = Literal["igual", "maior_que"]
StatusObservacao = Literal["rascunho", "publicado"]

# Decimal exato em texto, sem notação científica: a precisão recebida é preservada.
ValorDecimal = Annotated[
    str,
    StringConstraints(strip_whitespace=True, pattern=r"^[0-9]+(\.[0-9]+)?$", max_length=60),
    Field(description="Decimal não negativo em texto, com a precisão original (ex.: \"0.0328478422252442\")."),
]
Codigo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
CodigoCnae = Annotated[
    str,
    StringConstraints(strip_whitespace=True, pattern=r"^[0-9]{4}-[0-9]/[0-9]{2}$"),
    Field(description="Subclasse CNAE, classificação própria e opcional; nunca inferida da categoria."),
]
Nota = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


# Itens de catálogo. extra="allow" preserva metadados novos do catálogo na resposta.


class ItemCatalogo(BaseModel):
    model_config = ConfigDict(extra="allow")

    codigo: str
    nome: str


class Territorio(ItemCatalogo):
    tipo: str = Field(description="municipio, regional ou base_cadastral.")


class Categoria(ItemCatalogo):
    classificacao: str = Field(description="Classificação de origem (setor Sebrae, porte, hospedagem…).")
    codigo_cnae: str | None


class Unidade(ItemCatalogo):
    inteira: bool
    maximo: float | None = Field(description="Limite superior; nulo quando não há.")
    casas_exibicao: int = Field(description="Casas decimais usadas somente na apresentação.")


class Fonte(ItemCatalogo):
    links: list[str]


class _ComPublicados(BaseModel):
    com_dados_publicados: bool = Field(
        description="Há ao menos uma observação publicada usando este item."
    )


class ItemCatalogoResponse(ItemCatalogo, _ComPublicados):
    pass


class TerritorioCatalogoResponse(Territorio, _ComPublicados):
    pass


class CategoriaCatalogoResponse(Categoria, _ComPublicados):
    pass


class UnidadeCatalogoResponse(Unidade, _ComPublicados):
    pass


class FonteCatalogoResponse(Fonte, _ComPublicados):
    pass


class CatalogosResponse(BaseModel):
    temas: list[ItemCatalogoResponse]
    indicadores: list[ItemCatalogoResponse]
    categorias: list[CategoriaCatalogoResponse]
    territorios: list[TerritorioCatalogoResponse]
    unidades: list[UnidadeCatalogoResponse]
    fontes: list[FonteCatalogoResponse]


# Observações


class ReferenciaResponse(BaseModel):
    tipo: TipoReferencia
    ano_inicio: int
    ano_fim: int
    mes: int | None
    data_extracao: date | None = None
    rotulo: str = Field(description="Texto pronto para exibição; distingue anual, acumulado etc.")


class ObservacaoPublicaResponse(BaseModel):
    """Observação publicada. Ausência de um registro significa "sem dados", nunca zero."""

    id: str
    indicador: ItemCatalogo
    territorio: Territorio
    categoria: Categoria | None = Field(description="Recorte da fonte; nulo para o total.")
    codigo_cnae: str | None = Field(description="CNAE, separado da categoria; nulo quando não informado.")
    referencia: ReferenciaResponse
    valor: str = Field(description="Decimal exato, como recebido.")
    valor_exibicao: str = Field(description="Arredondado meio para cima nas casas_exibicao da unidade.")
    qualificador: Qualificador = Field(description="maior_que indica um limite (\"mais de\").")
    unidade: Unidade
    fonte: Fonte
    temas: list[ItemCatalogo]
    notas: list[str]
    demonstracao: bool


class ObservacaoAdminResponse(ObservacaoPublicaResponse):
    status: StatusObservacao
    divulgacao_bloqueada: bool
    motivo_bloqueio: str | None
    publicado_por: int | None
    publicado_em: datetime | None
    proveniencias: list[dict]


class ReferenciaRequest(BaseModel):
    tipo: TipoReferencia
    ano_inicio: Annotated[int, Field(ge=1900, le=2100)]
    ano_fim: Annotated[int, Field(ge=1900, le=2100)]
    mes: Annotated[int | None, Field(ge=1, le=12)] = None
    data_extracao: date | None = Field(default=None, description="Obrigatória somente em retrato.")

    @model_validator(mode="after")
    def coerente(self) -> "ReferenciaRequest":
        if self.ano_inicio > self.ano_fim:
            raise ValueError("O ano de início deve ser anterior ou igual ao ano de fim.")
        if (self.tipo == "mensal") != (self.mes is not None):
            raise ValueError("O mês é obrigatório na referência mensal e proibido nas demais.")
        if self.tipo in {"anual", "mensal", "retrato"} and self.ano_inicio != self.ano_fim:
            raise ValueError(f"A referência {self.tipo} tem um único ano.")
        if (self.tipo == "retrato") != (self.data_extracao is not None):
            raise ValueError("A data de extração é obrigatória no retrato e proibida nas demais.")
        if self.data_extracao and self.data_extracao.year != self.ano_inicio:
            raise ValueError("A data de extração deve pertencer ao ano da referência.")
        return self


class ObservacaoCreate(BaseModel):
    """Cadastro administrativo de uma observação completa; entra como rascunho."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "indicador_codigo": "i_…",
                    "territorio_codigo": "t_santa_rita_do_sapucai_…",
                    "categoria_codigo": None,
                    "codigo_cnae": None,
                    "referencia": {"tipo": "anual", "ano_inicio": 2025, "ano_fim": 2025},
                    "valor": "12",
                    "unidade_codigo": "u_…",
                    "qualificador": "igual",
                    "fonte_codigo": "f_…",
                    "temas": ["tema_…"],
                    "notas": [],
                }
            ]
        }
    )

    indicador_codigo: Codigo
    territorio_codigo: Codigo
    categoria_codigo: Codigo | None = None
    codigo_cnae: CodigoCnae | None = None
    referencia: ReferenciaRequest
    valor: ValorDecimal
    unidade_codigo: Codigo
    qualificador: Qualificador = "igual"
    fonte_codigo: Codigo
    temas: Annotated[list[Codigo], Field(min_length=1)]
    notas: list[Nota] = []


class ObservacaoUpdate(BaseModel):
    """Correção dos campos que não fazem parte da identidade da observação."""

    valor: ValorDecimal | None = None
    qualificador: Qualificador | None = None
    notas: list[Nota] | None = None

    @model_validator(mode="after")
    def algum_campo(self) -> "ObservacaoUpdate":
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para corrigir.")
        nulos = [c for c in self.model_fields_set if getattr(self, c) is None]
        if nulos:
            raise ValueError(f"Campos não podem ser nulos: {', '.join(sorted(nulos))}.")
        return self


class BloqueioRequest(BaseModel):
    motivo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
