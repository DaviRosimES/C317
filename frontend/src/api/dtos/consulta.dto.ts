export type EscopoConsultaDto = 'municipal' | 'cnae'
export type PeriodicidadeDto = 'mensal' | 'anual'

export interface CnaeResponseDto {
  id: number
  codigo: string
  nome: string
  fonte: string | null
  provisorio: boolean
  rotas: string[]
}

export interface TipoIndicadorResponseDto {
  codigo: string
  nome: string
  descricao: string
  unidade: string
  escopo: string
  fonte_referencia: string | null
  provisorio: boolean
}

export interface RotaResponseDto {
  codigo: string
  nome: string
  descricao: string
  cnaes: string[]
  composicao_pendente: boolean
}

export interface PeriodoResponseDto {
  ano: number
  mes: number | null
}

export interface IndicadoresQueryDto {
  tipo?: string[]
  cnae?: string[]
  rota?: string[]
  escopo?: EscopoConsultaDto
  periodicidade?: PeriodicidadeDto
  ano?: number
  mes?: number
  inicio?: string
  fim?: string
}

export interface IndicadorPublicoResponseDto {
  id: number
  tipo: string
  nome: string
  unidade: string
  escopo: string
  valor: string
  ano: number
  mes: number | null
  codigo_cnae: string | null
  nome_cnae: string | null
  rotas: string[]
  fonte: string
  demonstracao: boolean
}
