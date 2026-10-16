export type StatusLancamentoDto = 'rascunho' | 'publicado'

export interface IndicadoresAdminQueryDto {
  status?: StatusLancamentoDto
}

export interface IndicadorCreateRequestDto {
  tipo: string
  /** String decimal, sem perda de precisão. */
  valor: string
  ano: number
  /** Nulo para referência anual. */
  mes: number | null
  fonte: string
  codigo_cnae: string | null
  estabelecimento_id?: number | null
  demonstracao: boolean
}

/** Correção parcial: apenas os campos enviados são alterados. */
export type IndicadorUpdateRequestDto = Partial<IndicadorCreateRequestDto>

export interface IndicadorResponseDto {
  id: number
  tipo: string
  nome: string
  unidade: string
  escopo: string
  valor: string
  ano: number
  mes: number | null
  codigo_cnae: string | null
  estabelecimento_id: number | null
  fonte: string
  demonstracao: boolean
  status: string
  validado_por: number | null
}
