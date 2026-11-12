from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

TipoRelatorio = Literal["relatorio_tecnico", "peca_divulgacao"]
StatusRelatorio = Literal["rascunho", "publicado"]
Situacao = Literal["ativos", "arquivados", "todos"]

Titulo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
Fonte = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
Numero = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Ano = Annotated[int, Field(ge=1900, le=2100)]
Mes = Annotated[int, Field(ge=1, le=12)]


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


class RelatorioAdminResponse(BaseModel):
    """Relatório em qualquer situação, como a administração o consulta."""

    id: int
    titulo: str
    numero: str | None
    tipo: TipoRelatorio | None
    fonte: str | None = Field(description="Nula apenas em rascunhos antigos sem fonte confirmada.")
    data_publicacao: date | None = Field(description="Data original do documento, se informada.")
    ano: int | None
    mes: int | None
    status: StatusRelatorio
    arquivado: bool
    demonstracao: bool
    possui_pdf: bool = Field(description="O conteúdo vigente é um PDF baixado da API.")
    arquivo_nome: str | None = Field(description="Nome do PDF como foi enviado, quando conhecido.")
    link_externo: str | None = Field(description="Documento legado fora da API; nulo para PDFs.")


class _Referencia(BaseModel):
    @model_validator(mode="after")
    def _mes_exige_ano(self):
        if getattr(self, "mes", None) is not None and getattr(self, "ano", None) is None:
            raise ValueError("Mês de referência exige ano.")
        return self


class RelatorioCreate(_Referencia):
    """Metadados do cadastro (multipart, junto do PDF). Opcionais vazios contam como não informados."""

    model_config = ConfigDict(extra="forbid")

    titulo: Titulo
    fonte: Fonte
    numero: Numero | None = None
    tipo: TipoRelatorio | None = None
    data_publicacao: date | None = None
    ano: Ano | None = None
    mes: Mes | None = None

    @model_validator(mode="before")
    @classmethod
    def _vazios_sao_nulos(cls, dados):
        # Campos de formulário chegam como "" quando não preenchidos.
        if isinstance(dados, dict):
            return {
                chave: (None if chave not in {"titulo", "fonte"} and valor == "" else valor)
                for chave, valor in dados.items()
            }
        return dados


class RelatorioUpdate(BaseModel):
    """Correção parcial. Título e fonte não aceitam null; os demais metadados podem ser removidos."""

    model_config = ConfigDict(extra="forbid")

    titulo: Titulo | None = None
    fonte: Fonte | None = None
    numero: Numero | None = None
    tipo: TipoRelatorio | None = None
    data_publicacao: date | None = None
    ano: Ano | None = None
    mes: Mes | None = None

    @model_validator(mode="after")
    def _titulo_e_fonte_nao_nulos(self):
        for campo in ("titulo", "fonte"):
            if campo in self.model_fields_set and getattr(self, campo) is None:
                raise ValueError(f"{campo} não pode ser removido.")
        return self


class LimitesRelatorioResponse(BaseModel):
    tamanho_maximo_bytes: int = Field(description="Tamanho máximo do PDF enviado.")
    tipos_aceitos: list[str] = Field(description="Formatos aceitos; o conteúdo é conferido, não só o nome.")
