import type { IndicadorCreateRequestDto, IndicadorResponseDto, IndicadoresAdminQueryDto } from '@/api/dtos'
import type { Lancamento, LancamentoEntrada, LancamentosFiltro } from '@/models'
import { toEscopo, toUnidade } from './consulta.mapper'

export const toLancamento = (dto: IndicadorResponseDto): Lancamento => ({
  id: dto.id,
  tipo: dto.tipo,
  nome: dto.nome,
  unidade: toUnidade(dto.unidade),
  escopo: toEscopo(dto.escopo),
  valor: Number(dto.valor),
  periodo: { ano: dto.ano, mes: dto.mes },
  codigoCnae: dto.codigo_cnae,
  estabelecimentoId: dto.estabelecimento_id,
  fonte: dto.fonte,
  demonstracao: dto.demonstracao,
  status: dto.status === 'publicado' ? 'publicado' : 'rascunho',
  validadoPor: dto.validado_por,
})

export const toIndicadorRequestDto = (entrada: LancamentoEntrada): IndicadorCreateRequestDto => ({
  tipo: entrada.tipo,
  valor: entrada.valor,
  ano: entrada.periodo.ano,
  mes: entrada.periodo.mes,
  fonte: entrada.fonte,
  codigo_cnae: entrada.codigoCnae,
  demonstracao: entrada.demonstracao,
})

export const toIndicadoresAdminQueryDto = (filtro: LancamentosFiltro): IndicadoresAdminQueryDto => ({
  status: filtro.status,
})
