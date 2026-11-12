from datetime import date

from pydantic import BaseModel, Field

from app.schemas.dado_indicador import (
    CategoriaResponse,
    CodigoNome,
    FonteResponse,
    Qualificador,
    ReferenciaResponse,
    TipoReferencia,
    UnidadeResponse,
)


class PeriodoOpcao(BaseModel):
    """Uma referência completa disponível; `chave` é o valor do filtro `periodo`."""

    chave: str = Field(description="Ex.: `anual-2024`, `acumulada-2000-2024`, `levantamento-2022-2023`.")
    rotulo: str = Field(description="Ex.: \"2022 e 2023 — levantamento\".")
    tipo: TipoReferencia
    ano_inicio: int
    ano_fim: int
    mes: int | None
    data_extracao: date | None


class OpcoesConsultaResponse(BaseModel):
    setores: list[CodigoNome] = Field(
        description="Setores com ao menos um dado elegível em algum período; não dependem do período escolhido."
    )
    periodos: list[PeriodoOpcao] = Field(
        description="Períodos com dados elegíveis no setor informado (ou em todos), do mais recente ao mais antigo."
    )


class DadoPublico(BaseModel):
    id: str
    categoria: CategoriaResponse | None = Field(description="Recorte local; nulo para o total sem categoria.")
    fonte: FonteResponse
    referencia: ReferenciaResponse
    valor: str = Field(description="Decimal exato como texto; exiba com a unidade do indicador.")
    qualificador: Qualificador = Field(description="`maior_que` preserva \"mais de\".")
    notas: list[str]
    origens: list[dict] = Field(description="Localização documental do valor (arquivo, aba, célula).")
    demonstracao: bool


class IndicadorConsulta(BaseModel):
    codigo: str
    nome: str
    definicao: str
    nota_metodologica: str | None
    unidade: UnidadeResponse
    setores: list[CodigoNome]
    classificacoes: list[CodigoNome] = Field(description="Classificações aceitas, para os recortes locais.")
    dados: list[DadoPublico] = Field(description="Somente os dados que passaram nos filtros globais.")


class ConsultaResponse(BaseModel):
    setor: CodigoNome | None
    periodo: PeriodoOpcao | None
    indicadores: list[IndicadorConsulta] = Field(
        description="Cada indicador uma vez, ordenado por nome; vazio quando não há dado elegível."
    )


class DadoPublicoDetalhe(DadoPublico):
    indicador: CodigoNome
    unidade: UnidadeResponse


class FontePublica(FonteResponse):
    indicadores: int = Field(description="Quantidade de indicadores com dados elegíveis desta fonte.")
