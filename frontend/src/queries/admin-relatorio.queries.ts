import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminRelatorioService } from '@/api/services/admin-relatorio.service'
import type { RelatorioAdmin, RelatorioCorrecao, RelatorioEntrada, RelatoriosAdminFiltro } from '@/models'
import { adminKeys } from './admin.keys'
import { relatorioKeys } from './relatorio.queries'

export const adminRelatorioKeys = {
  all: [...adminKeys.all, 'relatorios'] as const,
  limites: () => [...adminRelatorioKeys.all, 'limites'] as const,
  listas: () => [...adminRelatorioKeys.all, 'lista'] as const,
  lista: (filtro: RelatoriosAdminFiltro) => [...adminRelatorioKeys.listas(), filtro] as const,
  detalhe: (id: number) => [...adminRelatorioKeys.all, 'detalhe', id] as const,
}

export const limitesRelatorioQueryOptions = queryOptions({
  queryKey: adminRelatorioKeys.limites(),
  queryFn: adminRelatorioService.limites,
  staleTime: 10 * 60_000,
})

export const relatoriosAdminQueryOptions = (filtro: RelatoriosAdminFiltro) =>
  queryOptions({
    queryKey: adminRelatorioKeys.lista(filtro),
    queryFn: () => adminRelatorioService.listar(filtro),
  })

export const relatorioAdminQueryOptions = (id: number) =>
  queryOptions({
    queryKey: adminRelatorioKeys.detalhe(id),
    queryFn: () => adminRelatorioService.obter(id),
  })

export const useLimitesRelatorio = () => useQuery(limitesRelatorioQueryOptions)
export const useRelatoriosAdmin = (filtro: RelatoriosAdminFiltro) => useQuery(relatoriosAdminQueryOptions(filtro))
export const useRelatorioAdmin = (id: number) => useQuery(relatorioAdminQueryOptions(id))

/** Atualiza o detalhe, invalida as listas administrativas e a consulta pública de relatórios. */
function useAtualizarCache() {
  const queryClient = useQueryClient()
  return (relatorio: RelatorioAdmin) => {
    queryClient.setQueryData(adminRelatorioKeys.detalhe(relatorio.id), relatorio)
    void queryClient.invalidateQueries({ queryKey: adminRelatorioKeys.listas() })
    void queryClient.invalidateQueries({ queryKey: relatorioKeys.all })
  }
}

export function useCriarRelatorio() {
  const atualizar = useAtualizarCache()
  return useMutation({ mutationFn: (entrada: RelatorioEntrada) => adminRelatorioService.criar(entrada), onSuccess: atualizar })
}

export function useCorrigirRelatorio() {
  const atualizar = useAtualizarCache()
  return useMutation({
    mutationFn: ({ id, correcao }: { id: number; correcao: RelatorioCorrecao }) => adminRelatorioService.corrigir(id, correcao),
    onSuccess: atualizar,
  })
}

export function useSubstituirArquivoRelatorio() {
  const atualizar = useAtualizarCache()
  return useMutation({
    mutationFn: ({ id, arquivo }: { id: number; arquivo: File }) => adminRelatorioService.substituirArquivo(id, arquivo),
    onSuccess: atualizar,
  })
}

/** PDF vigente para conferência (exige o token, então vem como Blob). */
export function useBaixarArquivoRelatorio() {
  return useMutation({ mutationFn: (id: number) => adminRelatorioService.baixarArquivo(id) })
}

export function usePublicarRelatorio() {
  const atualizar = useAtualizarCache()
  return useMutation({ mutationFn: (id: number) => adminRelatorioService.publicar(id), onSuccess: atualizar })
}

export function useDespublicarRelatorio() {
  const atualizar = useAtualizarCache()
  return useMutation({ mutationFn: (id: number) => adminRelatorioService.despublicar(id), onSuccess: atualizar })
}

export function useArquivarRelatorio() {
  const atualizar = useAtualizarCache()
  return useMutation({ mutationFn: (id: number) => adminRelatorioService.arquivar(id), onSuccess: atualizar })
}

export function useRestaurarRelatorio() {
  const atualizar = useAtualizarCache()
  return useMutation({ mutationFn: (id: number) => adminRelatorioService.restaurar(id), onSuccess: atualizar })
}
