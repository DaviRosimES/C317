import { z } from 'zod'

/** Eixos de indicadores disponíveis nos filtros (chips do Figma). */
export const indicatorCategories = ['hospedagem', 'empregos', 'empresas'] as const
export const indicatorCategorySchema = z.enum(indicatorCategories)
export type IndicatorCategory = z.infer<typeof indicatorCategorySchema>

export const indicatorCategoryLabels: Record<IndicatorCategory, string> = {
  hospedagem: 'Hospedagem',
  empregos: 'Empregos',
  empresas: 'Empresas',
}

/**
 * Filtros compartilhados pelas telas de indicadores.
 * Pensado para `validateSearch` do TanStack Router: a URL vira estado tipado.
 */
export const indicatorFiltersSchema = z.object({
  categoria: indicatorCategorySchema.catch('hospedagem'),
  ano: z.coerce.number().int().min(2000).max(2100).catch(new Date().getFullYear()),
})

export type IndicatorFilters = z.infer<typeof indicatorFiltersSchema>
