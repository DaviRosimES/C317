/** Contratos dos Dados do indicador na administração (V9): backend/app/schemas/dado_indicador.py. */
import type { CodigoNomeDto, SituacaoArquivoDto, UnidadeResumoDto } from './definicao.dto'
import type { QualificadorDto, TipoReferenciaDto } from './observacao.dto'

export type StatusDadoDto = 'rascunho' | 'publicado'

export interface ReferenciaDadoResponseDto {
  tipo: TipoReferenciaDto
  ano_inicio: number
  ano_fim: number
  mes: number | null
  /** Data ISO (AAAA-MM-DD), somente em retrato. */
  data_extracao: string | null
  /** Chave do Ano/Período (ex.: `anual-2024`, `acumulada-2000-2024`). */
  chave: string
  /** Rótulo para exibição (ex.: "2000–2024 — acumulado"). */
  rotulo: string
}

export interface CategoriaDoDadoResponseDto extends CodigoNomeDto {
  classificacao_codigo: string
  classificacao_nome: string
  codigo_cnae: string | null
}

export interface FonteDoDadoResponseDto extends CodigoNomeDto {
  links: string[]
}

export interface IndicadorDoDadoResponseDto extends CodigoNomeDto {
  /** Indicador arquivado oculta o dado sem mudar o estado dele. */
  arquivado: boolean
}

export interface DadoAdminResponseDto {
  /** Identificador estável; preservado em todas as correções. */
  id: string
  indicador: IndicadorDoDadoResponseDto
  /** Herdada da definição do indicador. */
  unidade: UnidadeResumoDto
  territorio: CodigoNomeDto
  /** Nula para o dado sem categoria (total informado pela fonte). */
  categoria: CategoriaDoDadoResponseDto | null
  fonte: FonteDoDadoResponseDto
  referencia: ReferenciaDadoResponseDto
  /** Decimal exato como texto. */
  valor: string
  qualificador: QualificadorDto
  notas: string[]
  /** Localização documental do valor recebido (arquivo, aba, célula…); vazia em cadastro manual. */
  origens: Record<string, unknown>[]
  status: StatusDadoDto
  arquivado: boolean
  divulgacao_bloqueada: boolean
  motivo_bloqueio: string | null
  demonstracao: boolean
  /** Publicado, não arquivado, não bloqueado, de indicador ativo e de Santa Rita do Sapucaí. */
  visivel_publicamente: boolean
}

export interface ReferenciaDadoRequestDto {
  tipo: TipoReferenciaDto
  ano_inicio: number
  /** Obrigatório em acumulada e levantamento; nos demais, igual ao início. */
  ano_fim: number | null
  /** Somente na referência mensal. */
  mes: number | null
  /** Somente no retrato (AAAA-MM-DD). */
  data_extracao: string | null
}

/** Território, unidade e setores vêm da definição e não são enviados. */
export interface DadoCreateRequestDto {
  indicador_codigo: string
  categoria_codigo: string | null
  referencia: ReferenciaDadoRequestDto
  /** Texto decimal; a API recusa número. */
  valor: string
  qualificador: QualificadorDto
  fonte_codigo: string
  notas: string[]
}

/** Correção parcial que preserva o id; só `categoria_codigo` aceita null. O indicador não muda. */
export interface DadoUpdateRequestDto {
  categoria_codigo?: string | null
  referencia?: ReferenciaDadoRequestDto
  valor?: string
  qualificador?: QualificadorDto
  fonte_codigo?: string
  notas?: string[]
}

export interface DadosAdminQueryDto {
  indicador?: string
  situacao?: SituacaoArquivoDto
  status?: StatusDadoDto
}

export interface BloqueioDadoRequestDto {
  motivo: string
}
