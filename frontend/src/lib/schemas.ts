import { z } from 'zod'
import { TIPOS_REFERENCIA } from './referencia'

export const dashboardSearchSchema = z.object({
  ano: z.coerce.number().int().min(1900).max(2100).optional().catch(undefined),
  mes: z.coerce.number().int().min(1).max(12).optional().catch(undefined),
  cnae: z.string().optional().catch(undefined),
})
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>

const codigoCatalogo = z.string().min(1).max(200)

export const consultaSearchSchema = z.object({
  tema: codigoCatalogo.optional().catch(undefined),
  territorio: codigoCatalogo.optional().catch(undefined),
  ref: z
    .string()
    .regex(/^(tipo:[a-z_]+|[a-z_]+:\d{4}-\d{4}(-\d{2})?)$/)
    .optional()
    .catch(undefined),
  categoria: codigoCatalogo.optional().catch(undefined),
  cnae: z
    .string()
    .regex(/^[0-9]{4}-[0-9]\/[0-9]{2}$/)
    .optional()
    .catch(undefined),
})
export type ConsultaSearch = z.infer<typeof consultaSearchSchema>

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
