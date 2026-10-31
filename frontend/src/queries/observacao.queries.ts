import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { observacaoService } from '@/api/services/observacao.service'
import type { ObservacoesFiltro } from '@/models'

const CATALOGO_STALE = 10 * 60_000

export const observacaoKeys = {
  all: ['observacoes'] as const,
  catalogos: () => [...observacaoKeys.all, 'catalogos'] as const,
  lista: (filtro: ObservacoesFiltro) => [...observacaoKeys.all, 'lista', filtro] as const,
  publica: (id: string) => [...observacaoKeys.all, 'publica', id] as const,
}

export const catalogosObservacoesQueryOptions = queryOptions({
  queryKey: observacaoKeys.catalogos(),
  queryFn: observacaoService.catalogos,
  staleTime: CATALOGO_STALE,
})

export const observacoesQueryOptions = (filtro: ObservacoesFiltro) =>
  queryOptions({
    queryKey: observacaoKeys.lista(filtro),
    queryFn: () => observacaoService.listarTodas(filtro),
    placeholderData: keepPreviousData,
  })

/** O que a consulta pública devolve para a observação; 404 enquanto for rascunho ou estiver bloqueada. */
export const observacaoPublicaQueryOptions = (id: string) =>
  queryOptions({
    queryKey: observacaoKeys.publica(id),
    queryFn: () => observacaoService.obter(id),
    staleTime: 0,
  })

export const useCatalogosObservacoes = () => useQuery(catalogosObservacoesQueryOptions)
export const useObservacoes = (filtro: ObservacoesFiltro, enabled = true) =>
  useQuery({ ...observacoesQueryOptions(filtro), enabled })
export const useObservacaoPublica = (id: string) => useQuery(observacaoPublicaQueryOptions(id))
