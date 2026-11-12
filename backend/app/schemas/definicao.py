from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

TipoReferencia = Literal["anual", "mensal", "acumulada", "levantamento", "retrato"]
Situacao = Literal["ativos", "arquivados", "todos"]

Nome = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]
Codigo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
# Texto como recebido: um tipo URL normalizaria o endereço (ex.: acrescentando "/").
Link = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^https?://\S+$", max_length=2000)]
CodigoCnae = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[0-9]{4}-[0-9]/[0-9]{2}$")]


# Catálogos


class SetorResponse(BaseModel):
    codigo: str = Field(description="Código opaco; pode conter o prefixo histórico `tema_`.")
    nome: str
    em_uso: bool = Field(description="Associado a ao menos uma definição.")


class UnidadeResponse(BaseModel):
    codigo: str
    nome: str
    inteira: bool
    maximo: float | None = Field(description="Limite superior; nulo quando não informado.")
    casas_exibicao: int = Field(description="Casas decimais usadas somente na apresentação.")
    em_uso: bool


class FonteResponse(BaseModel):
    codigo: str
    nome: str
    links: list[str]
    em_uso: bool = Field(description="Usada por ao menos um dado.")


class ClassificacaoResponse(BaseModel):
    codigo: str
    nome: str
    em_uso: bool = Field(description="Permitida por alguma definição ou com categorias usadas por dados.")


class CategoriaResponse(BaseModel):
    codigo: str
    nome: str
    classificacao_codigo: str
    codigo_cnae: str | None = Field(description="Só quando informado pela fonte; nunca inferido.")
    em_uso: bool = Field(description="Usada por ao menos um dado.")


class CatalogosResponse(BaseModel):
    setores: list[SetorResponse]
    unidades: list[UnidadeResponse]
    fontes: list[FonteResponse]
    classificacoes: list[ClassificacaoResponse]
    categorias: list[CategoriaResponse]


class FonteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: Nome
    links: list[Link] = []


class FonteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: Nome | None = None
    links: list[Link] | None = None


class ClassificacaoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: Nome


class ClassificacaoUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: Nome


class CategoriaCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: Nome
    classificacao_codigo: Codigo
    codigo_cnae: CodigoCnae | None = None


class CategoriaUpdate(BaseModel):
    """Nome é descritivo; classificação e CNAE mudam o significado e só valem fora de uso."""

    model_config = ConfigDict(extra="forbid")

    nome: Nome | None = None
    classificacao_codigo: Codigo | None = None
    codigo_cnae: CodigoCnae | None = None


# Definições


class ItemResumo(BaseModel):
    codigo: str
    nome: str


class UnidadeResumo(BaseModel):
    codigo: str
    nome: str
    inteira: bool
    maximo: float | None
    casas_exibicao: int


class DefinicaoResponse(BaseModel):
    codigo: str = Field(description="Gerado no cadastro e preservado ao renomear.")
    nome: str
    definicao: str
    nota_metodologica: str | None
    unidade: UnidadeResumo
    setores: list[ItemResumo] = Field(description="Setores do Observatório; ao menos um.")
    tipos_referencia_permitidos: list[TipoReferencia]
    classificacoes_permitidas: list[ItemResumo]
    aceita_sem_categoria: bool
    arquivado: bool
    total_dados: int = Field(description="Dados vinculados, inclusive rascunhos e arquivados.")


class DefinicaoCreate(BaseModel):
    """O código é gerado pelo sistema; o usuário não informa chave técnica."""

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "nome": "Cidade vista como: Acolhedora",
                    "definicao": "Percentual dos entrevistados que associaram a cidade ao atributo Acolhedora.",
                    "unidade_codigo": "u_dos_entrevistados_d2d9128f71",
                    "setores": ["tema_economia_criativa_ca3ef6a61b"],
                    "tipos_referencia_permitidos": ["anual"],
                    "classificacoes_permitidas": ["publico_pesquisa"],
                    "aceita_sem_categoria": False,
                    "nota_metodologica": None,
                }
            ]
        },
    )

    nome: Nome
    definicao: Texto
    unidade_codigo: Codigo
    setores: Annotated[list[Codigo], Field(min_length=1)]
    tipos_referencia_permitidos: Annotated[list[TipoReferencia], Field(min_length=1)]
    classificacoes_permitidas: list[Codigo] = []
    aceita_sem_categoria: bool
    nota_metodologica: Texto | None = None


class DefinicaoUpdate(BaseModel):
    """Correção parcial. `nota_metodologica: null` remove a nota."""

    model_config = ConfigDict(extra="forbid")

    nome: Nome | None = None
    definicao: Texto | None = None
    unidade_codigo: Codigo | None = None
    setores: Annotated[list[Codigo], Field(min_length=1)] | None = None
    tipos_referencia_permitidos: Annotated[list[TipoReferencia], Field(min_length=1)] | None = None
    classificacoes_permitidas: list[Codigo] | None = None
    aceita_sem_categoria: bool | None = None
    nota_metodologica: Texto | None = None

    @model_validator(mode="after")
    def campos(self) -> "DefinicaoUpdate":
        if not self.model_fields_set:
            raise ValueError("Informe ao menos um campo para corrigir.")
        nulos = [
            campo
            for campo in self.model_fields_set - {"nota_metodologica"}
            if getattr(self, campo) is None
        ]
        if nulos:
            raise ValueError(f"Campos não podem ser nulos: {', '.join(sorted(nulos))}.")
        return self
