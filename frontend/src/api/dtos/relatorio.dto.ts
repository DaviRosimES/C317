export interface RelatorioPublicoResponseDto {
  id: number
  titulo: string
  fonte: string
  /** Data ISO sem horário (AAAA-MM-DD). */
  data_publicacao: string
  ano: number
  mes: number | null
  demonstracao: boolean
}
