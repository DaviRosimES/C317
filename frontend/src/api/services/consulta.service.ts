import { http } from '@/api/http/client'
import type {
  CnaeResponseDto,
  IndicadorPublicoResponseDto,
  PeriodoResponseDto,
  RotaResponseDto,
  TipoIndicadorResponseDto,
} from '@/api/dtos'
import {
  toCnae,
  toIndicadoresQueryDto,
  toPeriodo,
  toRota,
  toTipoIndicador,
} from '@/api/mappers/consulta.mapper'
import { toIndicador } from '@/api/mappers/indicador.mapper'
import type { Cnae, Indicador, IndicadoresFiltro, Periodo, Rota, TipoIndicador } from '@/models'

export const consultaService = {
  async listarCnaes(): Promise<Cnae[]> {
    const { data } = await http.get<CnaeResponseDto[]>('/cnaes')
    return data.map(toCnae)
  },

  async listarTiposIndicadores(): Promise<TipoIndicador[]> {
    const { data } = await http.get<TipoIndicadorResponseDto[]>('/tipos-indicadores')
    return data.map(toTipoIndicador)
  },

  async listarRotas(): Promise<Rota[]> {
    const { data } = await http.get<RotaResponseDto[]>('/rotas')
    return data.map(toRota)
  },

  async listarPeriodos(): Promise<Periodo[]> {
    const { data } = await http.get<PeriodoResponseDto[]>('/periodos')
    return data.map(toPeriodo)
  },

  async listarIndicadores(filtro: IndicadoresFiltro = {}): Promise<Indicador[]> {
    const { data } = await http.get<IndicadorPublicoResponseDto[]>('/indicadores', {
      params: toIndicadoresQueryDto(filtro),
    })
    return data.map(toIndicador)
  },
}
