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

export type StatusRelatorio = 'rascunho' | 'publicado'
export type SituacaoRelatorio = 'ativos' | 'arquivados' | 'todos'

/** Conteúdo vigente: um único PDF ou, em legados, um link externo. */
export type ConteudoRelatorio =
  | { tipo: 'pdf'; nomeArquivo: string | null }
  | { tipo: 'link'; url: string; destino: string }
  | { tipo: 'ausente' }

export interface RelatorioAdmin {
  id: number
  titulo: string
  numero: string | null
  tipo: TipoRelatorio | null
  /** Nula em rascunhos antigos sem fonte confirmada. */
  fonte: string | null
  dataPublicacao: Date | null
  periodo: Periodo | null
  status: StatusRelatorio
  arquivado: boolean
  demonstracao: boolean
  possuiPdf: boolean
  arquivoNome: string | null
  linkExterno: string | null
  conteudo: ConteudoRelatorio
}

/** Cadastro: opcionais só quando informados no documento. */
export interface RelatorioEntrada {
  titulo: string
  fonte: string
  arquivo: File
  numero?: string
  tipo?: TipoRelatorio
  dataPublicacao?: Date
  ano?: number
  mes?: number
}

/** Correção: só o que mudou; `null` remove um opcional. */
export interface RelatorioCorrecao {
  titulo?: string
  fonte?: string
  numero?: string | null
  tipo?: TipoRelatorio | null
  dataPublicacao?: Date | null
  ano?: number | null
  mes?: number | null
}

export interface LimitesRelatorio {
  tamanhoMaximoBytes: number
  tiposAceitos: string[]
}

export interface RelatoriosAdminFiltro {
  situacao?: SituacaoRelatorio
  status?: StatusRelatorio
}
