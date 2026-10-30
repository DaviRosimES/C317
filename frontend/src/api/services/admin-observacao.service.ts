import { http } from '@/api/http/client'
import type {
  BloqueioRequestDto,
  CatalogosResponseDto,
  ObservacaoAdminDetalheResponseDto,
  PaginaObservacoesAdminResponseDto,
} from '@/api/dtos'
import {
  toCatalogos,
  toObservacaoAdminDetalhe,
  toObservacaoCreateDto,
  toObservacaoUpdateDto,
  toObservacoesAdminQueryDto,
  toPaginaObservacoesAdmin,
} from '@/api/mappers/observacao.mapper'
import type {
  Catalogos,
  ObservacaoAdminDetalhe,
  ObservacaoCorrecao,
  ObservacaoEntrada,
  ObservacoesAdminFiltro,
  PaginaObservacoesAdmin,
  Paginacao,
} from '@/models'

const URL = '/admin/observacoes'
const item = (id: string) => `${URL}/${encodeURIComponent(id)}`

/** Cadastro, correção e publicação das observações da M6 (exige sessão administrativa). */
export const adminObservacaoService = {
  /** Catálogo completo para o formulário, inclusive itens ainda sem dado publicado. */
  async catalogos(): Promise<Catalogos> {
    const { data } = await http.get<CatalogosResponseDto>(`${URL}/catalogos`)
    return toCatalogos(data)
  },

  /** Todas as observações, inclusive rascunhos e bloqueadas, uma página por vez (padrão: 200). */
  async listar(filtro: ObservacoesAdminFiltro = {}, pagina?: Paginacao): Promise<PaginaObservacoesAdmin> {
    const { data } = await http.get<PaginaObservacoesAdminResponseDto>(URL, {
      params: toObservacoesAdminQueryDto(filtro, pagina),
    })
    return toPaginaObservacoesAdmin(data)
  },

  async obter(id: string): Promise<ObservacaoAdminDetalhe> {
    const { data } = await http.get<ObservacaoAdminDetalheResponseDto>(item(id))
    return toObservacaoAdminDetalhe(data)
  },

  /** Cria como rascunho; 409 se já houver observação com a mesma identidade. */
  async criar(entrada: ObservacaoEntrada): Promise<ObservacaoAdminDetalhe> {
    const { data } = await http.post<ObservacaoAdminDetalheResponseDto>(URL, toObservacaoCreateDto(entrada))
    return toObservacaoAdminDetalhe(data)
  },

  /** Corrige valor, qualificador ou notas; o valor anterior fica no histórico. */
  async corrigir(id: string, correcao: ObservacaoCorrecao): Promise<ObservacaoAdminDetalhe> {
    const { data } = await http.patch<ObservacaoAdminDetalheResponseDto>(item(id), toObservacaoUpdateDto(correcao))
    return toObservacaoAdminDetalhe(data)
  },

  /** 422 com o motivo quando a divulgação está bloqueada. */
  async publicar(id: string): Promise<ObservacaoAdminDetalhe> {
    const { data } = await http.post<ObservacaoAdminDetalheResponseDto>(`${item(id)}/publicar`)
    return toObservacaoAdminDetalhe(data)
  },

  async despublicar(id: string): Promise<ObservacaoAdminDetalhe> {
    const { data } = await http.post<ObservacaoAdminDetalheResponseDto>(`${item(id)}/despublicar`)
    return toObservacaoAdminDetalhe(data)
  },

  /** Uma observação publicada também sai da consulta pública. */
  async bloquear(id: string, motivo: string): Promise<ObservacaoAdminDetalhe> {
    const body: BloqueioRequestDto = { motivo }
    const { data } = await http.post<ObservacaoAdminDetalheResponseDto>(`${item(id)}/bloquear`, body)
    return toObservacaoAdminDetalhe(data)
  },

  /** Continua em rascunho até ser publicada. */
  async desbloquear(id: string): Promise<ObservacaoAdminDetalhe> {
    const { data } = await http.post<ObservacaoAdminDetalheResponseDto>(`${item(id)}/desbloquear`)
    return toObservacaoAdminDetalhe(data)
  },
}
