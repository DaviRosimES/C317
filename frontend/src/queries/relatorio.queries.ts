import { queryOptions, useQuery } from '@tanstack/react-query'
import { relatorioService } from '@/api/services/relatorio.service'

export const relatorioKeys = {
  all: ['relatorios'] as const,
  publicos: () => [...relatorioKeys.all, 'publicos'] as const,
}

export const relatoriosQueryOptions = queryOptions({
  queryKey: relatorioKeys.publicos(),
  queryFn: relatorioService.listarPublicos,
})

export const useRelatorios = () => useQuery(relatoriosQueryOptions)
