import { http } from '@/api/http/client'
import type { CatalogosResponseDto, ObservacaoPublicaResponseDto, PaginaObservacoesPublicasResponseDto } from '@/api/dtos'
import { toCatalogos, toObservacao, toObservacoesQueryDto, toPaginaObservacoes } from '@/api/mappers/observacao.mapper'
import type { Catalogos, Observacao, ObservacoesFiltro, PaginaObservacoes, Paginacao } from '@/models'

const URL = '/observacoes'
const LIMITE_PAGINA = 1000

/** Consulta pública das observações da M6: somente publicadas e sem bloqueio de divulgação. */
export const observacaoService = {
  /** Itens de catálogo usados por observações publicadas; nada só de rascunho ou bloqueado. */
  async catalogos(): Promise<Catalogos> {
    const { data } = await http.get<CatalogosResponseDto>(`${URL}/catalogos`)
    return toCatalogos(data)
  },

  async listar(filtro: ObservacoesFiltro = {}, pagina?: Paginacao): Promise<PaginaObservacoes> {
    const { data } = await http.get<PaginaObservacoesPublicasResponseDto>(URL, { params: toObservacoesQueryDto(filtro, pagina) })
    return toPaginaObservacoes(data)
  },

  async listarTodas(filtro: ObservacoesFiltro = {}): Promise<Observacao[]> {
    const itens: Observacao[] = []
    for (;;) {
      const pagina = await observacaoService.listar(filtro, { limite: LIMITE_PAGINA, deslocamento: itens.length })
      itens.push(...pagina.itens)
      if (!pagina.itens.length || itens.length >= pagina.total) return itens
    }
  },

  /** 404 quando a observação é rascunho, está bloqueada ou não existe. */
  async obter(id: string): Promise<Observacao> {
    const { data } = await http.get<ObservacaoPublicaResponseDto>(`${URL}/${encodeURIComponent(id)}`)
    return toObservacao(data)
  },
}
