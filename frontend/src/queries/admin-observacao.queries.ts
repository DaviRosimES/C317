import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { adminObservacaoService } from '@/api/services/admin-observacao.service'
import type { ObservacaoAdminDetalhe, ObservacaoCorrecao, ObservacaoEntrada, ObservacoesAdminFiltro } from '@/models'
import { consultaKeys } from './consulta.queries'
import { observacaoKeys } from './observacao.queries'

const CATALOGO_STALE = 10 * 60_000
/** Página da listagem administrativa ("Mostrar mais"). */
const POR_PAGINA = 30
/** Maior página aceita pela API, para as consultas pontuais (sugestões, duplicidade). */
const LIMITE_MAXIMO = 1000

export const adminObservacaoKeys = {
  all: ['admin-observacoes'] as const,
  catalogos: () => [...adminObservacaoKeys.all, 'catalogos'] as const,
  listas: () => [...adminObservacaoKeys.all, 'lista'] as const,
  paginas: (filtro: ObservacoesAdminFiltro) => [...adminObservacaoKeys.listas(), 'paginas', filtro] as const,
  lista: (filtro: ObservacoesAdminFiltro) => [...adminObservacaoKeys.listas(), 'ate-o-limite', filtro] as const,
  detalhe: (id: string) => [...adminObservacaoKeys.all, 'detalhe', id] as const,
}

/** Inclui indicadores, categorias e fontes ainda sem dado publicado, que o catálogo público omite. */
export const catalogosAdminQueryOptions = queryOptions({
  queryKey: adminObservacaoKeys.catalogos(),
  queryFn: adminObservacaoService.catalogos,
  staleTime: CATALOGO_STALE,
})

/** Listagem paginada no servidor; cada página traz o total que atende aos filtros. */
export const observacoesAdminPaginasQueryOptions = (filtro: ObservacoesAdminFiltro) =>
  infiniteQueryOptions({
    queryKey: adminObservacaoKeys.paginas(filtro),
    queryFn: ({ pageParam }) => adminObservacaoService.listar(filtro, { limite: POR_PAGINA, deslocamento: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (ultima) => {
      const proxima = ultima.deslocamento + ultima.itens.length
      return proxima < ultima.total ? proxima : undefined
    },
    placeholderData: keepPreviousData,
  })

/** Uma única página com o limite máximo, para resumir ou localizar observações de um filtro estreito. */
export const observacoesAdminQueryOptions = (filtro: ObservacoesAdminFiltro) =>
  queryOptions({
    queryKey: adminObservacaoKeys.lista(filtro),
    queryFn: () => adminObservacaoService.listar(filtro, { limite: LIMITE_MAXIMO, deslocamento: 0 }),
    placeholderData: keepPreviousData,
  })

export const observacaoAdminQueryOptions = (id: string) =>
  queryOptions({
    queryKey: adminObservacaoKeys.detalhe(id),
    queryFn: () => adminObservacaoService.obter(id),
  })

export const useCatalogosAdmin = () => useQuery(catalogosAdminQueryOptions)
export const useObservacoesAdminPaginas = (filtro: ObservacoesAdminFiltro) =>
  useInfiniteQuery(observacoesAdminPaginasQueryOptions(filtro))
export const useObservacoesAdmin = (filtro: ObservacoesAdminFiltro, enabled = true) =>
  useQuery({ ...observacoesAdminQueryOptions(filtro), enabled })
export const useObservacaoAdmin = (id: string) => useQuery(observacaoAdminQueryOptions(id))

/**
 * Após cadastrar, corrigir, publicar ou bloquear: atualiza o detalhe e as listas e invalida a
 * consulta pública (observação, catálogos com dados publicados e as consultas anteriores).
 */
function useAtualizarCache() {
  const queryClient = useQueryClient()
  return (observacao: ObservacaoAdminDetalhe) => {
    queryClient.setQueryData(adminObservacaoKeys.detalhe(observacao.id), observacao)
    void queryClient.invalidateQueries({ queryKey: adminObservacaoKeys.listas() })
    void queryClient.invalidateQueries({ queryKey: observacaoKeys.all })
    void queryClient.invalidateQueries({ queryKey: consultaKeys.all })
  }
}

export function useCriarObservacao() {
  const atualizarCache = useAtualizarCache()
  return useMutation({
    mutationFn: (entrada: ObservacaoEntrada) => adminObservacaoService.criar(entrada),
    onSuccess: atualizarCache,
  })
}

export function useCorrigirObservacao() {
  const atualizarCache = useAtualizarCache()
  return useMutation({
    mutationFn: ({ id, correcao }: { id: string; correcao: ObservacaoCorrecao }) =>
      adminObservacaoService.corrigir(id, correcao),
    onSuccess: atualizarCache,
  })
}

export function usePublicarObservacao() {
  const atualizarCache = useAtualizarCache()
  return useMutation({ mutationFn: (id: string) => adminObservacaoService.publicar(id), onSuccess: atualizarCache })
}

export function useDespublicarObservacao() {
  const atualizarCache = useAtualizarCache()
  return useMutation({ mutationFn: (id: string) => adminObservacaoService.despublicar(id), onSuccess: atualizarCache })
}

export function useBloquearObservacao() {
  const atualizarCache = useAtualizarCache()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => adminObservacaoService.bloquear(id, motivo),
    onSuccess: atualizarCache,
  })
}

export function useDesbloquearObservacao() {
  const atualizarCache = useAtualizarCache()
  return useMutation({ mutationFn: (id: string) => adminObservacaoService.desbloquear(id), onSuccess: atualizarCache })
}
