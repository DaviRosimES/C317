import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminObservacaoService } from '@/api/services/admin-observacao.service'
import type { ObservacaoAdmin, ObservacaoCorrecao, ObservacaoEntrada, ObservacoesAdminFiltro } from '@/models'
import { consultaKeys } from './consulta.queries'
import { observacaoKeys } from './observacao.queries'

export const adminObservacaoKeys = {
  all: ['admin-observacoes'] as const,
  listas: () => [...adminObservacaoKeys.all, 'lista'] as const,
  lista: (filtro: ObservacoesAdminFiltro) => [...adminObservacaoKeys.listas(), filtro] as const,
  detalhe: (id: string) => [...adminObservacaoKeys.all, 'detalhe', id] as const,
}

export const observacoesAdminQueryOptions = (filtro: ObservacoesAdminFiltro) =>
  queryOptions({
    queryKey: adminObservacaoKeys.lista(filtro),
    queryFn: () => adminObservacaoService.listar(filtro),
    placeholderData: keepPreviousData,
  })

export const observacaoAdminQueryOptions = (id: string) =>
  queryOptions({
    queryKey: adminObservacaoKeys.detalhe(id),
    queryFn: () => adminObservacaoService.obter(id),
  })

export const useObservacoesAdmin = (filtro: ObservacoesAdminFiltro, enabled = true) =>
  useQuery({ ...observacoesAdminQueryOptions(filtro), enabled })
export const useObservacaoAdmin = (id: string) => useQuery(observacaoAdminQueryOptions(id))

/**
 * Após cadastrar, corrigir, publicar ou bloquear: atualiza o detalhe e as listas e invalida a
 * consulta pública (observação, catálogos com dados publicados e as consultas anteriores).
 */
function useAtualizarCache() {
  const queryClient = useQueryClient()
  return (observacao: ObservacaoAdmin) => {
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
