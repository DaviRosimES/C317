import type { Periodo } from './periodo'

export type TipoRelatorio = 'relatorio_tecnico' | 'peca_divulgacao'

/** PDF servido pela API (download sem autenticação) ou documento publicado em outro endereço. */
export type AcessoRelatorio = { tipo: 'arquivo'; url: string } | { tipo: 'link'; url: string; destino: string }

export interface Relatorio {
  id: number
  titulo: string
  /** Número, tipo, data e referência são nulos quando a fonte não os informa; nunca presumidos. */
  numero: string | null
  tipo: TipoRelatorio | null
  fonte: string
  dataPublicacao: Date | null
  periodo: Periodo | null
  demonstracao: boolean
  acesso: AcessoRelatorio
}
