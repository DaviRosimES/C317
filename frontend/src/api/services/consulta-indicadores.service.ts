import { http } from '@/api/http/client'
import type { ConsultaResponseDto, OpcoesConsultaResponseDto } from '@/api/dtos'
import { toConsultaQueryDto, toOpcoesConsulta, toResultadoConsulta } from '@/api/mappers/consulta-indicadores.mapper'
import type { ConsultaFiltro, OpcoesConsulta, ResultadoConsulta } from '@/models'

/** Consulta pública (`/consulta`): Santa Rita do Sapucaí é fixa; não há parâmetro de cidade. */
export const consultaIndicadoresService = {
  /** Setores com dados elegíveis e os períodos disponíveis no setor (ou em todos, sem setor). */
  async opcoes(setor?: string): Promise<OpcoesConsulta> {
    const { data } = await http.get<OpcoesConsultaResponseDto>('/consulta/opcoes', {
      params: toConsultaQueryDto({ setor }),
    })
    return toOpcoesConsulta(data)
  },

  /** Indicadores com dados elegíveis na seleção, cada um uma vez e só com os dados filtrados. */
  async consultar(filtro: ConsultaFiltro): Promise<ResultadoConsulta> {
    const { data } = await http.get<ConsultaResponseDto>('/consulta/indicadores', {
      params: toConsultaQueryDto(filtro),
    })
    return toResultadoConsulta(data)
  },
}
