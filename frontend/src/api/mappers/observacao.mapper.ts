import type {
  CatalogosResponseDto,
  CategoriaDto,
  FonteDto,
  ObservacaoAdminResponseDto,
  ObservacaoCreateRequestDto,
  ObservacaoPublicaResponseDto,
  ObservacaoUpdateRequestDto,
  ObservacoesAdminQueryDto,
  ReferenciaResponseDto,
  UnidadeDto,
} from '@/api/dtos'
import { toDataIso } from '@/lib/format'
import type {
  Catalogos,
  Categoria,
  Fonte,
  Observacao,
  ObservacaoAdmin,
  ObservacaoCorrecao,
  ObservacaoEntrada,
  ObservacoesAdminFiltro,
  Proveniencia,
  ReferenciaRotulada,
  Unidade,
} from '@/models'
import { toDataLocal } from './relatorio.mapper'

const toCategoria = (dto: CategoriaDto): Categoria => ({
  codigo: dto.codigo,
  nome: dto.nome,
  classificacao: dto.classificacao,
  codigoCnae: dto.codigo_cnae,
})

const toUnidade = (dto: UnidadeDto): Unidade => ({
  codigo: dto.codigo,
  nome: dto.nome,
  inteira: dto.inteira,
  maximo: dto.maximo,
  casasExibicao: dto.casas_exibicao,
})

const toFonte = (dto: FonteDto): Fonte => ({ codigo: dto.codigo, nome: dto.nome, links: dto.links })

export const toCatalogos = (dto: CatalogosResponseDto): Catalogos => ({
  temas: dto.temas.map((t) => ({ codigo: t.codigo, nome: t.nome, comDadosPublicados: t.com_dados_publicados })),
  indicadores: dto.indicadores.map((i) => ({ codigo: i.codigo, nome: i.nome, comDadosPublicados: i.com_dados_publicados })),
  categorias: dto.categorias.map((c) => ({ ...toCategoria(c), comDadosPublicados: c.com_dados_publicados })),
  territorios: dto.territorios.map((t) => ({
    codigo: t.codigo,
    nome: t.nome,
    tipo: t.tipo,
    comDadosPublicados: t.com_dados_publicados,
  })),
  unidades: dto.unidades.map((u) => ({ ...toUnidade(u), comDadosPublicados: u.com_dados_publicados })),
  fontes: dto.fontes.map((f) => ({ ...toFonte(f), comDadosPublicados: f.com_dados_publicados })),
})

const toReferencia = (dto: ReferenciaResponseDto): ReferenciaRotulada => ({
  tipo: dto.tipo,
  anoInicio: dto.ano_inicio,
  anoFim: dto.ano_fim,
  mes: dto.mes,
  dataExtracao: dto.data_extracao ? toDataLocal(dto.data_extracao) : null,
  rotulo: dto.rotulo,
})

const texto = (valor: unknown) => (valor == null ? null : String(valor))

function toProveniencia(dto: Record<string, unknown>): Proveniencia {
  if (typeof dto.aba === 'string') {
    return {
      tipo: 'planilha',
      aba: dto.aba,
      celula: String(dto.celula ?? ''),
      indicadorOriginal: texto(dto.indicador_original),
      recorteOriginal: texto(dto.recorte_original),
      referenciaOriginal: texto(dto.referencia_original),
      valorOriginal: texto(dto.valor_xml),
    }
  }
  return {
    tipo: 'registro',
    origem: String(dto.origem ?? 'desconhecida'),
    usuarioId: typeof dto.usuario_id === 'number' ? dto.usuario_id : null,
    registradoEm: typeof dto.registrado_em === 'string' ? new Date(dto.registrado_em) : null,
    anterior: dto.anterior && typeof dto.anterior === 'object' ? (dto.anterior as Record<string, unknown>) : null,
  }
}

export const toObservacao = (dto: ObservacaoPublicaResponseDto): Observacao => ({
  id: dto.id,
  indicador: { codigo: dto.indicador.codigo, nome: dto.indicador.nome },
  territorio: { codigo: dto.territorio.codigo, nome: dto.territorio.nome, tipo: dto.territorio.tipo },
  categoria: dto.categoria ? toCategoria(dto.categoria) : null,
  codigoCnae: dto.codigo_cnae,
  referencia: toReferencia(dto.referencia),
  // O valor continua texto: number arredondaria decimais longos.
  valor: dto.valor,
  valorExibicao: dto.valor_exibicao,
  qualificador: dto.qualificador,
  unidade: toUnidade(dto.unidade),
  fonte: toFonte(dto.fonte),
  temas: dto.temas.map((t) => ({ codigo: t.codigo, nome: t.nome })),
  notas: dto.notas,
  demonstracao: dto.demonstracao,
})

export const toObservacaoAdmin = (dto: ObservacaoAdminResponseDto): ObservacaoAdmin => ({
  ...toObservacao(dto),
  status: dto.status === 'publicado' ? 'publicado' : 'rascunho',
  divulgacaoBloqueada: dto.divulgacao_bloqueada,
  motivoBloqueio: dto.motivo_bloqueio,
  publicadoPor: dto.publicado_por,
  publicadoEm: dto.publicado_em ? new Date(dto.publicado_em) : null,
  proveniencias: dto.proveniencias.map(toProveniencia),
})

export const toObservacaoCreateDto = (entrada: ObservacaoEntrada): ObservacaoCreateRequestDto => ({
  indicador_codigo: entrada.indicadorCodigo,
  territorio_codigo: entrada.territorioCodigo,
  categoria_codigo: entrada.categoriaCodigo,
  codigo_cnae: entrada.codigoCnae,
  referencia: {
    tipo: entrada.referencia.tipo,
    ano_inicio: entrada.referencia.anoInicio,
    ano_fim: entrada.referencia.anoFim,
    mes: entrada.referencia.mes,
    data_extracao: entrada.referencia.dataExtracao ? toDataIso(entrada.referencia.dataExtracao) : null,
  },
  valor: entrada.valor,
  unidade_codigo: entrada.unidadeCodigo,
  qualificador: entrada.qualificador,
  fonte_codigo: entrada.fonteCodigo,
  temas: entrada.temas,
  notas: entrada.notas,
})

export const toObservacaoUpdateDto = (correcao: ObservacaoCorrecao): ObservacaoUpdateRequestDto => ({
  valor: correcao.valor,
  qualificador: correcao.qualificador,
  notas: correcao.notas,
})

export const toObservacoesAdminQueryDto = (filtro: ObservacoesAdminFiltro): ObservacoesAdminQueryDto => ({
  tema: filtro.temas,
  indicador: filtro.indicadores,
  territorio: filtro.territorios,
  categoria: filtro.categorias,
  referencia_tipo: filtro.referenciaTipos,
  ano: filtro.ano,
  ano_inicio: filtro.anoInicio,
  ano_fim: filtro.anoFim,
  status: filtro.status,
  divulgacao_bloqueada: filtro.divulgacaoBloqueada,
})
