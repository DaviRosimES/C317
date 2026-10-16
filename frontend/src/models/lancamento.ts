import type { EscopoIndicador, UnidadeIndicador } from './catalogo'
import type { Periodo } from './periodo'

export type StatusLancamento = 'rascunho' | 'publicado'

/** Lançamento de indicador visto pela área administrativa, inclusive rascunhos. */
export interface Lancamento {
  id: number
  tipo: string
  nome: string
  unidade: UnidadeIndicador
  escopo: EscopoIndicador
  valor: number
  periodo: Periodo
  codigoCnae: string | null
  estabelecimentoId: number | null
  fonte: string
  demonstracao: boolean
  status: StatusLancamento
  validadoPor: number | null
}

/** Dados informados no formulário; `valor` é a string decimal enviada à API ("68.25"). */
export interface LancamentoEntrada {
  tipo: string
  valor: string
  periodo: Periodo
  fonte: string
  codigoCnae: string | null
  demonstracao: boolean
}

export interface LancamentosFiltro {
  status?: StatusLancamento
}
