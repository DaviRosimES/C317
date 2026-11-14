import type {
  CatalogosAdminResponseDto,
  CategoriaCreateRequestDto,
  DefinicaoCreateRequestDto,
  DefinicaoResponseDto,
  DefinicaoUpdateRequestDto,
  DefinicoesQueryDto,
  UnidadeResumoDto,
} from '@/api/dtos'
import type {
  CatalogosAdmin,
  CategoriaEntrada,
  DefinicaoCorrecao,
  DefinicaoEntrada,
  DefinicaoIndicador,
  DefinicoesFiltro,
  Unidade,
} from '@/models'

export const toUnidadeResumo = (dto: UnidadeResumoDto): Unidade => ({
  codigo: dto.codigo,
  nome: dto.nome,
  inteira: dto.inteira,
  maximo: dto.maximo,
  casasExibicao: dto.casas_exibicao,
})

export const toCatalogosAdmin = (dto: CatalogosAdminResponseDto): CatalogosAdmin => ({
  setores: dto.setores.map((s) => ({ codigo: s.codigo, nome: s.nome, emUso: s.em_uso })),
  unidades: dto.unidades.map((u) => ({ ...toUnidadeResumo(u), emUso: u.em_uso })),
  fontes: dto.fontes.map((f) => ({ codigo: f.codigo, nome: f.nome, links: f.links, emUso: f.em_uso })),
  classificacoes: dto.classificacoes.map((c) => ({ codigo: c.codigo, nome: c.nome, emUso: c.em_uso })),
  categorias: dto.categorias.map((c) => ({
    codigo: c.codigo,
    nome: c.nome,
    classificacaoCodigo: c.classificacao_codigo,
    codigoCnae: c.codigo_cnae,
    emUso: c.em_uso,
  })),
})

export const toCategoriaCreateDto = (entrada: CategoriaEntrada): CategoriaCreateRequestDto => ({
  nome: entrada.nome,
  classificacao_codigo: entrada.classificacaoCodigo,
  codigo_cnae: entrada.codigoCnae,
})

export const toDefinicao = (dto: DefinicaoResponseDto): DefinicaoIndicador => ({
  codigo: dto.codigo,
  nome: dto.nome,
  definicao: dto.definicao,
  notaMetodologica: dto.nota_metodologica,
  unidade: toUnidadeResumo(dto.unidade),
  setores: dto.setores,
  tiposReferenciaPermitidos: dto.tipos_referencia_permitidos,
  classificacoesPermitidas: dto.classificacoes_permitidas,
  aceitaSemCategoria: dto.aceita_sem_categoria,
  arquivado: dto.arquivado,
  totalDados: dto.total_dados,
})

export const toDefinicaoCreateDto = (entrada: DefinicaoEntrada): DefinicaoCreateRequestDto => ({
  nome: entrada.nome,
  definicao: entrada.definicao,
  unidade_codigo: entrada.unidadeCodigo,
  setores: entrada.setores,
  tipos_referencia_permitidos: entrada.tiposReferenciaPermitidos,
  classificacoes_permitidas: entrada.classificacoesPermitidas,
  aceita_sem_categoria: entrada.aceitaSemCategoria,
  nota_metodologica: entrada.notaMetodologica,
})

/** Envia só os campos presentes na correção: a API trata ausência e null de forma diferente. */
export function toDefinicaoUpdateDto(correcao: DefinicaoCorrecao): DefinicaoUpdateRequestDto {
  const dto: DefinicaoUpdateRequestDto = {}
  if (correcao.nome !== undefined) dto.nome = correcao.nome
  if (correcao.definicao !== undefined) dto.definicao = correcao.definicao
  if (correcao.unidadeCodigo !== undefined) dto.unidade_codigo = correcao.unidadeCodigo
  if (correcao.setores !== undefined) dto.setores = correcao.setores
  if (correcao.tiposReferenciaPermitidos !== undefined) dto.tipos_referencia_permitidos = correcao.tiposReferenciaPermitidos
  if (correcao.classificacoesPermitidas !== undefined) dto.classificacoes_permitidas = correcao.classificacoesPermitidas
  if (correcao.aceitaSemCategoria !== undefined) dto.aceita_sem_categoria = correcao.aceitaSemCategoria
  if (correcao.notaMetodologica !== undefined) dto.nota_metodologica = correcao.notaMetodologica
  return dto
}

export const toDefinicoesQueryDto = (filtro: DefinicoesFiltro): DefinicoesQueryDto => ({
  situacao: filtro.situacao,
  setor: filtro.setor,
  busca: filtro.busca?.trim() || undefined,
})
