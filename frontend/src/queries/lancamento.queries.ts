import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lancamentoService } from '@/api/services/lancamento.service'
import type { Lancamento, LancamentoEntrada, LancamentosFiltro } from '@/models'
import { consultaKeys } from './consulta.queries'

export const lancamentoKeys = {
  all: ['lancamentos'] as const,
  listas: () => [...lancamentoKeys.all, 'lista'] as const,
  lista: (filtro: LancamentosFiltro) => [...lancamentoKeys.listas(), filtro] as const,
  detalhe: (id: number) => [...lancamentoKeys.all, 'detalhe', id] as const,
}

export const lancamentosQueryOptions = (filtro: LancamentosFiltro) =>
  queryOptions({
    queryKey: lancamentoKeys.lista(filtro),
    queryFn: () => lancamentoService.listar(filtro),
    placeholderData: keepPreviousData,
  })

export const lancamentoQueryOptions = (id: number) =>
  queryOptions({
    queryKey: lancamentoKeys.detalhe(id),
    queryFn: () => lancamentoService.obter(id),
  })

export const useLancamentos = (filtro: LancamentosFiltro, enabled = true) =>
  useQuery({ ...lancamentosQueryOptions(filtro), enabled })
export const useLancamento = (id: number) => useQuery(lancamentoQueryOptions(id))

/** Após salvar ou publicar: atualiza o detalhe, as listas e a consulta pública (séries e períodos). */
function useAtualizarCache() {
  const queryClient = useQueryClient()
  return (lancamento: Lancamento) => {
    queryClient.setQueryData(lancamentoKeys.detalhe(lancamento.id), lancamento)
    void queryClient.invalidateQueries({ queryKey: lancamentoKeys.listas() })
    void queryClient.invalidateQueries({ queryKey: consultaKeys.all })
  }
}

export function useCriarLancamento() {
  const atualizarCache = useAtualizarCache()
  return useMutation({
    mutationFn: (entrada: LancamentoEntrada) => lancamentoService.criar(entrada),
    onSuccess: atualizarCache,
  })
}

export function useAtualizarLancamento() {
  const atualizarCache = useAtualizarCache()
  return useMutation({
    mutationFn: ({ id, entrada }: { id: number; entrada: LancamentoEntrada }) => lancamentoService.atualizar(id, entrada),
    onSuccess: atualizarCache,
  })
}

export function usePublicarLancamento() {
  const atualizarCache = useAtualizarCache()
  return useMutation({
    mutationFn: (id: number) => lancamentoService.publicar(id),
    onSuccess: atualizarCache,
  })
}
