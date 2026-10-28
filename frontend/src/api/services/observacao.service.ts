import { http } from '@/api/http/client'
import type { CatalogosResponseDto, ObservacaoPublicaResponseDto } from '@/api/dtos'
import { toCatalogos, toObservacao } from '@/api/mappers/observacao.mapper'
import type { Catalogos, Observacao } from '@/models'

const URL = '/observacoes'

/** Consulta pública das observações da M6: somente publicadas e sem bloqueio de divulgação. */
export const observacaoService = {
  /** Temas, indicadores, categorias, territórios, unidades e fontes, lidos do banco. */
  async catalogos(): Promise<Catalogos> {
    const { data } = await http.get<CatalogosResponseDto>(`${URL}/catalogos`)
    return toCatalogos(data)
  },

  /** 404 quando a observação é rascunho, está bloqueada ou não existe. */
  async obter(id: string): Promise<Observacao> {
    const { data } = await http.get<ObservacaoPublicaResponseDto>(`${URL}/${encodeURIComponent(id)}`)
    return toObservacao(data)
  },
}
