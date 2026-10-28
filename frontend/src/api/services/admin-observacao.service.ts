import { http } from '@/api/http/client'
import type { BloqueioRequestDto, ObservacaoAdminResponseDto } from '@/api/dtos'
import {
  toObservacaoAdmin,
  toObservacaoCreateDto,
  toObservacaoUpdateDto,
  toObservacoesAdminQueryDto,
} from '@/api/mappers/observacao.mapper'
import type { ObservacaoAdmin, ObservacaoCorrecao, ObservacaoEntrada, ObservacoesAdminFiltro } from '@/models'

const URL = '/admin/observacoes'
const item = (id: string) => `${URL}/${encodeURIComponent(id)}`

/** Cadastro, correção e publicação das observações da M6 (exige sessão administrativa). */
export const adminObservacaoService = {
  /** Todas as observações, inclusive rascunhos e bloqueadas. */
  async listar(filtro: ObservacoesAdminFiltro = {}): Promise<ObservacaoAdmin[]> {
    const { data } = await http.get<ObservacaoAdminResponseDto[]>(URL, { params: toObservacoesAdminQueryDto(filtro) })
    return data.map(toObservacaoAdmin)
  },

  async obter(id: string): Promise<ObservacaoAdmin> {
    const { data } = await http.get<ObservacaoAdminResponseDto>(item(id))
    return toObservacaoAdmin(data)
  },

  /** Cria como rascunho; 409 se já houver observação com a mesma identidade. */
  async criar(entrada: ObservacaoEntrada): Promise<ObservacaoAdmin> {
    const { data } = await http.post<ObservacaoAdminResponseDto>(URL, toObservacaoCreateDto(entrada))
    return toObservacaoAdmin(data)
  },

  /** Corrige valor, qualificador ou notas; o valor anterior fica nas proveniências. */
  async corrigir(id: string, correcao: ObservacaoCorrecao): Promise<ObservacaoAdmin> {
    const { data } = await http.patch<ObservacaoAdminResponseDto>(item(id), toObservacaoUpdateDto(correcao))
    return toObservacaoAdmin(data)
  },

  /** 422 com o motivo quando a divulgação está bloqueada. */
  async publicar(id: string): Promise<ObservacaoAdmin> {
    const { data } = await http.post<ObservacaoAdminResponseDto>(`${item(id)}/publicar`)
    return toObservacaoAdmin(data)
  },

  async despublicar(id: string): Promise<ObservacaoAdmin> {
    const { data } = await http.post<ObservacaoAdminResponseDto>(`${item(id)}/despublicar`)
    return toObservacaoAdmin(data)
  },

  /** Uma observação publicada também sai da consulta pública. */
  async bloquear(id: string, motivo: string): Promise<ObservacaoAdmin> {
    const body: BloqueioRequestDto = { motivo }
    const { data } = await http.post<ObservacaoAdminResponseDto>(`${item(id)}/bloquear`, body)
    return toObservacaoAdmin(data)
  },

  /** Continua em rascunho até ser publicada. */
  async desbloquear(id: string): Promise<ObservacaoAdmin> {
    const { data } = await http.post<ObservacaoAdminResponseDto>(`${item(id)}/desbloquear`)
    return toObservacaoAdmin(data)
  },
}
