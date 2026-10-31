import type {
  CnaeResponseDto,
  IndicadoresQueryDto,
  PeriodoResponseDto,
  RotaResponseDto,
  TipoIndicadorResponseDto,
} from '@/api/dtos'
import type {
  Cnae,
  EscopoIndicador,
  IndicadoresFiltro,
  Periodo,
  Rota,
  TipoIndicador,
  UnidadeIndicador,
} from '@/models'

export const toUnidade = (unidade: string): UnidadeIndicador =>
  unidade === 'quantidade' || unidade === 'percentual' ? unidade : 'outra'

export const toEscopo = (escopo: string): EscopoIndicador =>
  escopo === 'municipal' || escopo === 'cnae' || escopo === 'estabelecimento' ? escopo : 'desconhecido'

export const toCnae = (dto: CnaeResponseDto): Cnae => ({ ...dto })

export const toTipoIndicador = (dto: TipoIndicadorResponseDto): TipoIndicador => ({
  codigo: dto.codigo,
  nome: dto.nome,
  descricao: dto.descricao,
  unidade: toUnidade(dto.unidade),
  unidadeOriginal: dto.unidade,
  escopo: toEscopo(dto.escopo),
  escopoOriginal: dto.escopo,
  fonteReferencia: dto.fonte_referencia,
  provisorio: dto.provisorio,
})

export const toRota = (dto: RotaResponseDto): Rota => ({
  codigo: dto.codigo,
  nome: dto.nome,
  descricao: dto.descricao,
  cnaes: dto.cnaes,
  composicaoPendente: dto.composicao_pendente,
})

export const toPeriodo = (dto: PeriodoResponseDto): Periodo => ({ ano: dto.ano, mes: dto.mes })

export const toIndicadoresQueryDto = (filtro: IndicadoresFiltro): IndicadoresQueryDto => ({
  tipo: filtro.tipos?.length ? filtro.tipos : undefined,
  cnae: filtro.cnaes?.length ? filtro.cnaes : undefined,
  rota: filtro.rotas?.length ? filtro.rotas : undefined,
  escopo: filtro.escopo,
  periodicidade: filtro.periodicidade,
  ano: filtro.ano,
  mes: filtro.mes,
  inicio: filtro.inicio,
  fim: filtro.fim,
})
