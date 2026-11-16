import type {
  ConsultaQueryDto,
  ConsultaResponseDto,
  DadoPublicoResponseDto,
  IndicadorConsultaResponseDto,
  OpcoesConsultaResponseDto,
  PeriodoOpcaoResponseDto,
} from '@/api/dtos'
import { toDataLocal } from '@/lib/format'
import type { ConsultaFiltro, DadoPublico, IndicadorConsulta, OpcoesConsulta, PeriodoOpcao, ResultadoConsulta } from '@/models'
import { toCategoriaDoDado, toReferenciaDado } from './dado-indicador.mapper'
import { toUnidadeResumo } from './definicao.mapper'

export const toPeriodoOpcao = (dto: PeriodoOpcaoResponseDto): PeriodoOpcao => ({
  chave: dto.chave,
  rotulo: dto.rotulo,
  tipo: dto.tipo,
  anoInicio: dto.ano_inicio,
  anoFim: dto.ano_fim,
  mes: dto.mes,
  dataExtracao: dto.data_extracao ? toDataLocal(dto.data_extracao) : null,
})

export const toOpcoesConsulta = (dto: OpcoesConsultaResponseDto): OpcoesConsulta => ({
  setores: dto.setores,
  periodos: dto.periodos.map(toPeriodoOpcao),
})

export const toDadoPublico = (dto: DadoPublicoResponseDto): DadoPublico => ({
  id: dto.id,
  categoria: dto.categoria ? toCategoriaDoDado(dto.categoria) : null,
  fonte: dto.fonte,
  referencia: toReferenciaDado(dto.referencia),
  valor: dto.valor,
  qualificador: dto.qualificador,
  notas: dto.notas,
  demonstracao: dto.demonstracao,
})

export const toIndicadorConsulta = (dto: IndicadorConsultaResponseDto): IndicadorConsulta => ({
  codigo: dto.codigo,
  nome: dto.nome,
  definicao: dto.definicao,
  notaMetodologica: dto.nota_metodologica,
  unidade: toUnidadeResumo(dto.unidade),
  setores: dto.setores,
  classificacoes: dto.classificacoes,
  dados: dto.dados.map(toDadoPublico),
})

export const toResultadoConsulta = (dto: ConsultaResponseDto): ResultadoConsulta => ({
  setor: dto.setor,
  periodo: dto.periodo ? toPeriodoOpcao(dto.periodo) : null,
  indicadores: dto.indicadores.map(toIndicadorConsulta),
})

export const toConsultaQueryDto = (filtro: ConsultaFiltro): ConsultaQueryDto => ({
  setor: filtro.setor || undefined,
  periodo: filtro.periodo || undefined,
})
