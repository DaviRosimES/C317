import { queryOptions, useQuery } from '@tanstack/react-query'
import { fonteConsultaService } from '@/api/services/fonte-consulta.service'
import { consultaKeys } from './consulta.queries'

/** Dentro de `consultaKeys.all`: as publicações da administração invalidam esta lista também. */
export const fonteConsultaKeys = {
  publicas: () => [...consultaKeys.all, 'fontes-publicas'] as const,
}

export const fontesPublicasQueryOptions = queryOptions({
  queryKey: fonteConsultaKeys.publicas(),
  queryFn: fonteConsultaService.listar,
})

export const useFontesPublicas = () => useQuery(fontesPublicasQueryOptions)
