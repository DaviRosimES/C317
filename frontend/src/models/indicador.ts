import type { UnidadeIndicador } from './catalogo'
import type { Periodo } from './periodo'

export interface Indicador {
  id: number
  tipo: string
  nome: string
  unidade: UnidadeIndicador
  unidadeOriginal: string
  escopo: string
  valor: number
  periodo: Periodo
  codigoCnae: string | null
  nomeCnae: string | null
  rotas: string[]
  fonte: string
  demonstracao: boolean
}

export interface IndicadoresFiltro {
  tipos?: string[]
  cnaes?: string[]
  rotas?: string[]
  escopo?: 'municipal' | 'cnae'
  periodicidade?: 'mensal' | 'anual'
  ano?: number
  mes?: number
  inicio?: string
  fim?: string
}
