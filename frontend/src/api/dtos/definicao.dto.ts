/** Contratos das definições de indicadores e dos catálogos (V7): backend/app/schemas/definicao.py. */
import type { TipoReferenciaDto } from './observacao.dto'

export type SituacaoArquivoDto = 'ativos' | 'arquivados' | 'todos'

export interface CodigoNomeDto {
  codigo: string
  nome: string
}

export interface UnidadeResumoDto extends CodigoNomeDto {
  inteira: boolean
  /** Limite superior; nulo quando não informado. */
  maximo: number | null
  /** Casas decimais usadas somente na apresentação. */
  casas_exibicao: number
}

// Catálogos (`/admin/catalogos`). `em_uso` indica vínculo com definições ou dados.

export interface SetorCatalogoResponseDto extends CodigoNomeDto {
  em_uso: boolean
}

export interface UnidadeCatalogoResponseDto extends UnidadeResumoDto {
  em_uso: boolean
}

export interface FonteCatalogoResponseDto extends CodigoNomeDto {
  links: string[]
  em_uso: boolean
}

export interface ClassificacaoCatalogoResponseDto extends CodigoNomeDto {
  em_uso: boolean
}

export interface CategoriaCatalogoResponseDto extends CodigoNomeDto {
  classificacao_codigo: string
  /** Só quando informado pela fonte; nunca inferido. */
  codigo_cnae: string | null
  em_uso: boolean
}

export interface CatalogosAdminResponseDto {
  setores: SetorCatalogoResponseDto[]
  unidades: UnidadeCatalogoResponseDto[]
  fontes: FonteCatalogoResponseDto[]
  classificacoes: ClassificacaoCatalogoResponseDto[]
  categorias: CategoriaCatalogoResponseDto[]
}

export interface FonteCreateRequestDto {
  nome: string
  /** Endereços `http(s)://`, guardados como recebidos. */
  links: string[]
}

export interface ClassificacaoCreateRequestDto {
  nome: string
}

export interface CategoriaCreateRequestDto {
  nome: string
  classificacao_codigo: string
  codigo_cnae: string | null
}

// Definições (`/admin/definicoes-indicadores`)

export interface DefinicaoResponseDto {
  /** Gerado no cadastro e preservado ao renomear. */
  codigo: string
  nome: string
  definicao: string
  nota_metodologica: string | null
  unidade: UnidadeResumoDto
  /** Setores do Observatório (códigos opacos, às vezes com o prefixo histórico `tema_`). */
  setores: CodigoNomeDto[]
  tipos_referencia_permitidos: TipoReferenciaDto[]
  classificacoes_permitidas: CodigoNomeDto[]
  aceita_sem_categoria: boolean
  arquivado: boolean
  /** Dados vinculados, inclusive rascunhos e arquivados. */
  total_dados: number
}

/** O código é gerado pelo sistema; a API recusa o campo `codigo`. */
export interface DefinicaoCreateRequestDto {
  nome: string
  definicao: string
  unidade_codigo: string
  setores: string[]
  tipos_referencia_permitidos: TipoReferenciaDto[]
  classificacoes_permitidas: string[]
  aceita_sem_categoria: boolean
  nota_metodologica: string | null
}

/** Correção parcial; só `nota_metodologica` aceita null (remove a nota). */
export type DefinicaoUpdateRequestDto = Partial<DefinicaoCreateRequestDto>

export interface DefinicoesQueryDto {
  situacao?: SituacaoArquivoDto
  setor?: string
  busca?: string
}
