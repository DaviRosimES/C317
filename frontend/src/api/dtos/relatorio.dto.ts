export type TipoRelatorioDto = 'relatorio_tecnico' | 'peca_divulgacao'

export interface RelatorioPublicoResponseDto {
  id: number
  titulo: string
  /** Número oficial ("004/2025"); nulo quando a fonte não informa. */
  numero: string | null
  /** Nulo quando a fonte não distingue relatório técnico de peça de divulgação. */
  tipo: TipoRelatorioDto | null
  fonte: string
  /** Data ISO sem horário (AAAA-MM-DD); nula quando desconhecida. */
  data_publicacao: string | null
  ano: number | null
  mes: number | null
  /** Documento fora da API (ex.: Google Drive); nulo quando o PDF é baixado da API. */
  link_externo: string | null
  demonstracao: boolean
}

export type StatusRelatorioDto = 'rascunho' | 'publicado'
export type SituacaoRelatorioDto = 'ativos' | 'arquivados' | 'todos'

/** Resposta de todas as rotas administrativas de relatório (`RelatorioAdminResponse`). */
export interface RelatorioAdminResponseDto {
  id: number
  titulo: string
  numero: string | null
  tipo: TipoRelatorioDto | null
  /** Nula apenas em rascunhos antigos sem fonte confirmada. */
  fonte: string | null
  /** Data original do documento (não a do envio). */
  data_publicacao: string | null
  ano: number | null
  mes: number | null
  status: StatusRelatorioDto
  arquivado: boolean
  demonstracao: boolean
  possui_pdf: boolean
  arquivo_nome: string | null
  /** Só em relatórios legados. */
  link_externo: string | null
}

/** Corpo do PATCH: só os campos alterados; `null` remove um opcional. */
export interface RelatorioUpdateRequestDto {
  titulo?: string
  fonte?: string
  numero?: string | null
  tipo?: TipoRelatorioDto | null
  data_publicacao?: string | null
  ano?: number | null
  mes?: number | null
}

export interface LimitesRelatorioResponseDto {
  tamanho_maximo_bytes: number
  tipos_aceitos: string[]
}

export interface RelatoriosAdminQueryDto {
  situacao?: SituacaoRelatorioDto
  status?: StatusRelatorioDto
}
