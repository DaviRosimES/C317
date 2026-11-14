import type { FontePublicaResponseDto } from '@/api/dtos'
import type { FontePublica } from '@/models'

export const toFontePublica = (dto: FontePublicaResponseDto): FontePublica => ({
  codigo: dto.codigo,
  nome: dto.nome,
  links: dto.links,
  indicadores: dto.indicadores,
})
