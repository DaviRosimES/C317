import { z } from 'zod'

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

