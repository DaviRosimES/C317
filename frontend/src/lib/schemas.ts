import { z } from 'zod'
import { TIPOS_REFERENCIA } from './referencia'

export const dashboardSearchSchema = z.object({
  ano: z.coerce.number().int().min(1900).max(2100).optional().catch(undefined),
  cnae: z.string().optional().catch(undefined),
})
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>

export const temasIndicadores = ['visao-geral', 'hospedagem', 'empresas', 'empregos', 'visitantes'] as const
export type TemaIndicador = (typeof temasIndicadores)[number]

export const indicadoresSearchSchema = z.object({
  tema: z.enum(temasIndicadores).catch('visao-geral'),
  de: z.coerce.number().int().min(1900).max(2100).optional().catch(undefined),
  ate: z.coerce.number().int().min(1900).max(2100).optional().catch(undefined),
  cnae: z.string().optional().catch(undefined),
})
export type IndicadoresSearch = z.infer<typeof indicadoresSearchSchema>

export const motivosLogin = ['expirada', 'saiu', 'sem-permissao'] as const
export type MotivoLogin = (typeof motivosLogin)[number]

export const loginSearchSchema = z.object({
  /** Tela administrativa a abrir após o login; aceita somente caminhos internos de /admin. */
  redirect: z
    .string()
    .regex(/^\/admin(?:[/?#]|$)/)
    .refine((caminho) => !caminho.startsWith('/admin/login'))
    .optional()
    .catch(undefined),
  motivo: z.enum(motivosLogin).optional().catch(undefined),
})
export type LoginSearch = z.infer<typeof loginSearchSchema>

export const lancamentosSearchSchema = z.object({
  status: z.enum(['rascunho', 'publicado']).optional().catch(undefined),
})
export type LancamentosSearch = z.infer<typeof lancamentosSearchSchema>

export const situacoesObservacao = ['rascunho', 'publicado', 'bloqueada'] as const
export type SituacaoObservacao = (typeof situacoesObservacao)[number]

/** Filtros da listagem administrativa de observações; os códigos vêm do catálogo da API. */
export const observacoesSearchSchema = z.object({
  situacao: z.enum(situacoesObservacao).optional().catch(undefined),
  tema: z.string().min(1).optional().catch(undefined),
  indicador: z.string().min(1).optional().catch(undefined),
  territorio: z.string().min(1).optional().catch(undefined),
  referencia: z.enum(TIPOS_REFERENCIA.map((item) => item.tipo)).optional().catch(undefined),
  ano: z.coerce.number().int().min(1900).max(2100).optional().catch(undefined),
})
export type ObservacoesSearch = z.infer<typeof observacoesSearchSchema>
