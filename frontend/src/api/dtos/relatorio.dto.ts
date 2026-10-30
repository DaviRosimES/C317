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
