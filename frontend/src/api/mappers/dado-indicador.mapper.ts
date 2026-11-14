import type {
  DadoAdminResponseDto,
  DadoCreateRequestDto,
  DadoUpdateRequestDto,
  DadosAdminQueryDto,
  ReferenciaDadoRequestDto,
} from '@/api/dtos'
import { toDataIso } from '@/lib/format'
import type { DadoCorrecao, DadoEntrada, DadoIndicadorAdmin, DadosAdminFiltro, OrigemDado, Referencia } from '@/models'
import { toUnidadeResumo } from './definicao.mapper'
import { toDataLocal } from './relatorio.mapper'

const texto = (valor: unknown) => (valor == null || valor === '' ? null : String(valor))

const toOrigem = (origem: Record<string, unknown>): OrigemDado => ({
  arquivo: texto(origem.arquivo),
  aba: texto(origem.aba),
  celula: texto(origem.celula),
  valorOriginal: texto(origem.valor_xml),
  recorteOriginal: texto(origem.recorte_original),
  referenciaOriginal: texto(origem.referencia_original),
})

export const toDadoIndicadorAdmin = (dto: DadoAdminResponseDto): DadoIndicadorAdmin => ({
  id: dto.id,
  indicador: dto.indicador,
  unidade: toUnidadeResumo(dto.unidade),
  territorio: dto.territorio,
  categoria: dto.categoria
    ? {
        codigo: dto.categoria.codigo,
        nome: dto.categoria.nome,
        classificacaoCodigo: dto.categoria.classificacao_codigo,
        classificacaoNome: dto.categoria.classificacao_nome,
        codigoCnae: dto.categoria.codigo_cnae,
      }
    : null,
  fonte: dto.fonte,
  referencia: {
    tipo: dto.referencia.tipo,
    anoInicio: dto.referencia.ano_inicio,
    anoFim: dto.referencia.ano_fim,
    mes: dto.referencia.mes,
    dataExtracao: dto.referencia.data_extracao ? toDataLocal(dto.referencia.data_extracao) : null,
    chave: dto.referencia.chave,
    rotulo: dto.referencia.rotulo,
  },
  valor: dto.valor,
  qualificador: dto.qualificador,
  notas: dto.notas,
  origens: dto.origens.map(toOrigem),
  status: dto.status,
  arquivado: dto.arquivado,
  divulgacaoBloqueada: dto.divulgacao_bloqueada,
  motivoBloqueio: dto.motivo_bloqueio,
  demonstracao: dto.demonstracao,
  visivelPublicamente: dto.visivel_publicamente,
})

const toReferenciaDadoDto = (r: Referencia): ReferenciaDadoRequestDto => ({
  tipo: r.tipo,
  ano_inicio: r.anoInicio,
  ano_fim: r.anoFim,
  mes: r.mes,
  data_extracao: r.dataExtracao ? toDataIso(r.dataExtracao) : null,
})

export const toDadoCreateDto = (entrada: DadoEntrada): DadoCreateRequestDto => ({
  indicador_codigo: entrada.indicadorCodigo,
  categoria_codigo: entrada.categoriaCodigo,
  referencia: toReferenciaDadoDto(entrada.referencia),
  valor: entrada.valor,
  qualificador: entrada.qualificador,
  fonte_codigo: entrada.fonteCodigo,
  notas: entrada.notas,
})

/** Envia só os campos presentes: `categoria_codigo: null` remove a categoria, ausência mantém. */
export function toDadoUpdateDto(correcao: DadoCorrecao): DadoUpdateRequestDto {
  const dto: DadoUpdateRequestDto = {}
  if (correcao.categoriaCodigo !== undefined) dto.categoria_codigo = correcao.categoriaCodigo
  if (correcao.referencia !== undefined) dto.referencia = toReferenciaDadoDto(correcao.referencia)
  if (correcao.valor !== undefined) dto.valor = correcao.valor
  if (correcao.qualificador !== undefined) dto.qualificador = correcao.qualificador
  if (correcao.fonteCodigo !== undefined) dto.fonte_codigo = correcao.fonteCodigo
  if (correcao.notas !== undefined) dto.notas = correcao.notas
  return dto
}

export const toDadosAdminQueryDto = (filtro: DadosAdminFiltro): DadosAdminQueryDto => ({
  indicador: filtro.indicador,
  situacao: filtro.situacao,
  status: filtro.status,
})
