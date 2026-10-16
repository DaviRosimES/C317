import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { consultaService } from '@/api/services/consulta.service'
import type { IndicadoresFiltro } from '@/models'

const CATALOGO_STALE = 10 * 60_000

export const consultaKeys = {
  all: ['consultas'] as const,
  cnaes: () => [...consultaKeys.all, 'cnaes'] as const,
  tipos: () => [...consultaKeys.all, 'tipos-indicadores'] as const,
  rotas: () => [...consultaKeys.all, 'rotas'] as const,
  periodos: () => [...consultaKeys.all, 'periodos'] as const,
  indicadores: (filtro: IndicadoresFiltro) => [...consultaKeys.all, 'indicadores', filtro] as const,
}

export const cnaesQueryOptions = queryOptions({
  queryKey: consultaKeys.cnaes(),
  queryFn: consultaService.listarCnaes,
  staleTime: CATALOGO_STALE,
})

export const tiposIndicadoresQueryOptions = queryOptions({
  queryKey: consultaKeys.tipos(),
  queryFn: consultaService.listarTiposIndicadores,
  staleTime: CATALOGO_STALE,
})

export const rotasQueryOptions = queryOptions({
  queryKey: consultaKeys.rotas(),
  queryFn: consultaService.listarRotas,
  staleTime: CATALOGO_STALE,
})

export const periodosQueryOptions = queryOptions({
  queryKey: consultaKeys.periodos(),
  queryFn: consultaService.listarPeriodos,
})

export const indicadoresQueryOptions = (filtro: IndicadoresFiltro) =>
  queryOptions({
    queryKey: consultaKeys.indicadores(filtro),
    queryFn: () => consultaService.listarIndicadores(filtro),
    placeholderData: keepPreviousData,
  })

export const useCnaes = () => useQuery(cnaesQueryOptions)
export const useTiposIndicadores = () => useQuery(tiposIndicadoresQueryOptions)
export const useRotas = () => useQuery(rotasQueryOptions)
export const usePeriodos = () => useQuery(periodosQueryOptions)
export const useIndicadores = (filtro: IndicadoresFiltro, enabled = true) =>
  useQuery({ ...indicadoresQueryOptions(filtro), enabled })
