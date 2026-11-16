/** Contratos da consulta pública por Setor e Ano/Período (V9): backend/app/schemas/consulta_indicadores.py. */
import type { CategoriaDoDadoResponseDto, FonteDoDadoResponseDto, ReferenciaDadoResponseDto } from './dado-indicador.dto'
import type { CodigoNomeDto, UnidadeResumoDto } from './definicao.dto'
import type { QualificadorDto, TipoReferenciaDto } from './observacao.dto'

/** Uma referência completa disponível; `chave` é o valor do filtro `periodo`. */
export interface PeriodoOpcaoResponseDto {
  /** Ex.: `anual-2024`, `acumulada-2000-2024`, `levantamento-2022-2023`. */
  chave: string
  /** Ex.: "2022 e 2023 — levantamento". */
  rotulo: string
  tipo: TipoReferenciaDto
  ano_inicio: number
  ano_fim: number
  mes: number | null
  /** Data ISO (AAAA-MM-DD), somente em retrato. */
  data_extracao: string | null
}

/** `GET /consulta/opcoes?setor=` */
export interface OpcoesConsultaResponseDto {
  /** Setores com ao menos um dado elegível em algum período; não dependem do período. */
  setores: CodigoNomeDto[]
  /** Períodos com dados elegíveis no setor informado (ou em todos), do mais recente ao mais antigo. */
  periodos: PeriodoOpcaoResponseDto[]
}

export interface DadoPublicoResponseDto {
  id: string
  /** Recorte local; nulo para o total sem categoria. */
  categoria: CategoriaDoDadoResponseDto | null
  fonte: FonteDoDadoResponseDto
  referencia: ReferenciaDadoResponseDto
  /** Decimal exato como texto; exibido com a unidade do indicador. */
  valor: string
  qualificador: QualificadorDto
  notas: string[]
  /** Localização documental do valor (arquivo, aba, célula). */
  origens: Record<string, unknown>[]
  demonstracao: boolean
}

export interface IndicadorConsultaResponseDto {
  codigo: string
  nome: string
  definicao: string
  nota_metodologica: string | null
  unidade: UnidadeResumoDto
  setores: CodigoNomeDto[]
  /** Classificações aceitas, para os recortes locais. */
  classificacoes: CodigoNomeDto[]
  /** Somente os dados que passaram nos filtros globais. */
  dados: DadoPublicoResponseDto[]
}

/** `GET /consulta/indicadores?setor=&periodo=` */
export interface ConsultaResponseDto {
  setor: CodigoNomeDto | null
  periodo: PeriodoOpcaoResponseDto | null
  /** Cada indicador uma vez, ordenado por nome; vazio quando não há dado elegível. */
  indicadores: IndicadorConsultaResponseDto[]
}

/** Omitido = todos. Um código inexistente responde 422. */
export interface ConsultaQueryDto {
  setor?: string
  periodo?: string
}
