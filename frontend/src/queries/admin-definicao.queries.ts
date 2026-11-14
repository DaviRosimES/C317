import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminCatalogoService, adminDefinicaoService } from '@/api/services/admin-definicao.service'
import type {
  CategoriaEntrada,
  ClassificacaoEntrada,
  DefinicaoCorrecao,
  DefinicaoEntrada,
  DefinicaoIndicador,
  DefinicoesFiltro,
  FonteEntrada,
} from '@/models'
import { adminKeys } from './admin.keys'
import { consultaKeys } from './consulta.queries'

export const definicaoKeys = {
  all: [...adminKeys.all, 'definicoes'] as const,
  listas: () => [...definicaoKeys.all, 'lista'] as const,
  lista: (filtro: DefinicoesFiltro) => [...definicaoKeys.listas(), filtro] as const,
  detalhe: (codigo: string) => [...definicaoKeys.all, 'detalhe', codigo] as const,
}

export const catalogoAdminKeys = {
  all: [...adminKeys.all, 'catalogos'] as const,
}

export const definicoesQueryOptions = (filtro: DefinicoesFiltro = {}) =>
  queryOptions({
    queryKey: definicaoKeys.lista(filtro),
    queryFn: () => adminDefinicaoService.listar(filtro),
    placeholderData: keepPreviousData,
  })

export const definicaoQueryOptions = (codigo: string) =>
  queryOptions({
    queryKey: definicaoKeys.detalhe(codigo),
    queryFn: () => adminDefinicaoService.obter(codigo),
  })

/** Setores, unidades, fontes, classificações e categorias, com `emUso`. */
export const catalogosAdminQueryOptions = queryOptions({
  queryKey: catalogoAdminKeys.all,
  queryFn: adminCatalogoService.listar,
  staleTime: 5 * 60_000,
})

export const useDefinicoes = (filtro: DefinicoesFiltro = {}) => useQuery(definicoesQueryOptions(filtro))
export const useDefinicao = (codigo: string, enabled = true) => useQuery({ ...definicaoQueryOptions(codigo), enabled })
export const useCatalogosAdmin = () => useQuery(catalogosAdminQueryOptions)

/**
 * Após cadastrar, corrigir, arquivar ou restaurar uma definição: atualiza o detalhe e as listas.
 * Os dados do indicador mostram nome e situação da definição, e a consulta pública depende dela.
 */
function useAtualizarDefinicao() {
  const queryClient = useQueryClient()
  return (definicao: DefinicaoIndicador) => {
    queryClient.setQueryData(definicaoKeys.detalhe(definicao.codigo), definicao)
    void queryClient.invalidateQueries({ queryKey: definicaoKeys.listas() })
    void queryClient.invalidateQueries({ queryKey: catalogoAdminKeys.all })
    void queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'dados-indicadores'] })
    void queryClient.invalidateQueries({ queryKey: consultaKeys.all })
  }
}

export function useCriarDefinicao() {
  const atualizar = useAtualizarDefinicao()
  return useMutation({ mutationFn: (entrada: DefinicaoEntrada) => adminDefinicaoService.criar(entrada), onSuccess: atualizar })
}

export function useCorrigirDefinicao() {
  const atualizar = useAtualizarDefinicao()
  return useMutation({
    mutationFn: ({ codigo, correcao }: { codigo: string; correcao: DefinicaoCorrecao }) =>
      adminDefinicaoService.corrigir(codigo, correcao),
    onSuccess: atualizar,
  })
}

export function useArquivarDefinicao() {
  const atualizar = useAtualizarDefinicao()
  return useMutation({ mutationFn: (codigo: string) => adminDefinicaoService.arquivar(codigo), onSuccess: atualizar })
}

export function useRestaurarDefinicao() {
  const atualizar = useAtualizarDefinicao()
  return useMutation({ mutationFn: (codigo: string) => adminDefinicaoService.restaurar(codigo), onSuccess: atualizar })
}

// Cadastros auxiliares: o item novo aparece nos formulários abertos assim que o catálogo é recarregado.

function useInvalidarCatalogos() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: catalogoAdminKeys.all })
}

export function useCriarFonte() {
  const invalidar = useInvalidarCatalogos()
  return useMutation({ mutationFn: (entrada: FonteEntrada) => adminCatalogoService.criarFonte(entrada), onSuccess: invalidar })
}

export function useCriarClassificacao() {
  const invalidar = useInvalidarCatalogos()
  return useMutation({
    mutationFn: (entrada: ClassificacaoEntrada) => adminCatalogoService.criarClassificacao(entrada),
    onSuccess: invalidar,
  })
}

export function useCriarCategoria() {
  const invalidar = useInvalidarCatalogos()
  return useMutation({
    mutationFn: (entrada: CategoriaEntrada) => adminCatalogoService.criarCategoria(entrada),
    onSuccess: invalidar,
  })
}
