import type { IndicadorPublicoResponseDto } from '@/api/dtos'
import type { Indicador } from '@/models'
import { toUnidade } from './consulta.mapper'

export const toIndicador = (dto: IndicadorPublicoResponseDto): Indicador => ({
  id: dto.id,
  tipo: dto.tipo,
  nome: dto.nome,
  unidade: toUnidade(dto.unidade),
  escopo: dto.escopo,
  valor: Number(dto.valor),
  periodo: { ano: dto.ano, mes: dto.mes },
  codigoCnae: dto.codigo_cnae,
  nomeCnae: dto.nome_cnae,
  rotas: dto.rotas,
  fonte: dto.fonte,
  demonstracao: dto.demonstracao,
})
