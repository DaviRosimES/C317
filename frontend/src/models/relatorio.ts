import type { Periodo } from './periodo'

export interface Relatorio {
  id: number
  titulo: string
  fonte: string
  dataPublicacao: Date
  periodo: Periodo
  demonstracao: boolean
  /** Endereço do PDF na API; o download não exige autenticação. */
  urlArquivo: string
}
