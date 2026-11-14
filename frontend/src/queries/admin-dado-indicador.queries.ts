import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminDadoIndicadorService } from '@/api/services/admin-dado-indicador.service'
import type { DadoCorrecao, DadoEntrada, DadoIndicadorAdmin, DadosAdminFiltro } from '@/models'
import { adminKeys } from './admin.keys'
import { catalogoAdminKeys, definicaoKeys } from './admin-definicao.queries'
import { consultaKeys } from './consulta.queries'
import { observacaoKeys } from './observacao.queries'

export const dadoIndicadorKeys = {
  all: [...adminKeys.all, 'dados-indicadores'] as const,
  listas: () => [...dadoIndicadorKeys.all, 'lista'] as const,
  lista: (filtro: DadosAdminFiltro) => [...dadoIndicadorKeys.listas(), filtro] as const,
  detalhe: (id: string) => [...dadoIndicadorKeys.all, 'detalhe', id] as const,
}

export const dadosIndicadorQueryOptions = (filtro: DadosAdminFiltro = {}) =>
  queryOptions({
    queryKey: dadoIndicadorKeys.lista(filtro),
    queryFn: () => adminDadoIndicadorService.listar(filtro),
    placeholderData: keepPreviousData,
  })

export const dadoIndicadorQueryOptions = (id: string) =>
  queryOptions({
    queryKey: dadoIndicadorKeys.detalhe(id),
    queryFn: () => adminDadoIndicadorService.obter(id),
  })

export const useDadosIndicador = (filtro: DadosAdminFiltro = {}, enabled = true) =>
  useQuery({ ...dadosIndicadorQueryOptions(filtro), enabled })
export const useDadoIndicador = (id: string) => useQuery(dadoIndicadorQueryOptions(id))

/**
 * Após cadastrar, corrigir, publicar, arquivar ou bloquear: atualiza o detalhe e as listas, a contagem
 * de dados das definições e o uso dos catálogos, e invalida a consulta pública.
 */
function useAtualizarDado() {
  const queryClient = useQueryClient()
  return (dado: DadoIndicadorAdmin) => {
    queryClient.setQueryData(dadoIndicadorKeys.detalhe(dado.id), dado)
    void queryClient.invalidateQueries({ queryKey: dadoIndicadorKeys.listas() })
    void queryClient.invalidateQueries({ queryKey: definicaoKeys.all })
    void queryClient.invalidateQueries({ queryKey: catalogoAdminKeys.all })
    void queryClient.invalidateQueries({ queryKey: consultaKeys.all })
    void queryClient.invalidateQueries({ queryKey: observacaoKeys.all })
  }
}

export function useCriarDado() {
  const atualizar = useAtualizarDado()
  return useMutation({ mutationFn: (entrada: DadoEntrada) => adminDadoIndicadorService.criar(entrada), onSuccess: atualizar })
}

export function useCorrigirDado() {
  const atualizar = useAtualizarDado()
  return useMutation({
    mutationFn: ({ id, correcao }: { id: string; correcao: DadoCorrecao }) => adminDadoIndicadorService.corrigir(id, correcao),
    onSuccess: atualizar,
  })
}

export function usePublicarDado() {
  const atualizar = useAtualizarDado()
  return useMutation({ mutationFn: (id: string) => adminDadoIndicadorService.publicar(id), onSuccess: atualizar })
}

export function useDespublicarDado() {
  const atualizar = useAtualizarDado()
  return useMutation({ mutationFn: (id: string) => adminDadoIndicadorService.despublicar(id), onSuccess: atualizar })
}

export function useArquivarDado() {
  const atualizar = useAtualizarDado()
  return useMutation({ mutationFn: (id: string) => adminDadoIndicadorService.arquivar(id), onSuccess: atualizar })
}

export function useRestaurarDado() {
  const atualizar = useAtualizarDado()
  return useMutation({ mutationFn: (id: string) => adminDadoIndicadorService.restaurar(id), onSuccess: atualizar })
}

export function useBloquearDado() {
  const atualizar = useAtualizarDado()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => adminDadoIndicadorService.bloquear(id, motivo),
    onSuccess: atualizar,
  })
}

export function useDesbloquearDado() {
  const atualizar = useAtualizarDado()
  return useMutation({ mutationFn: (id: string) => adminDadoIndicadorService.desbloquear(id), onSuccess: atualizar })
}
