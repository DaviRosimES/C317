import { http } from '@/api/http/client'
import type { FontePublicaResponseDto } from '@/api/dtos'
import { toFontePublica } from '@/api/mappers/fonte-consulta.mapper'
import type { FontePublica } from '@/models'

export const fonteConsultaService = {
  async listar(): Promise<FontePublica[]> {
    const { data } = await http.get<FontePublicaResponseDto[]>('/consulta/fontes')
    return data.map(toFontePublica)
  },
}
