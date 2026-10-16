import { http } from '@/api/http/client'
import type { RelatorioPublicoResponseDto } from '@/api/dtos'
import { toRelatorio } from '@/api/mappers/relatorio.mapper'
import type { Relatorio } from '@/models'

export const relatorioService = {
  async listarPublicos(): Promise<Relatorio[]> {
    const { data } = await http.get<RelatorioPublicoResponseDto[]>('/relatorios')
    return data.map((dto) => toRelatorio(dto, http.getUri({ url: `/relatorios/${dto.id}/arquivo` })))
  },
}
