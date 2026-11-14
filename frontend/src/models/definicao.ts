/** Definição do indicador (V7): o que se mede, em uma unidade, para um ou mais setores. Não guarda valor nem ano. */
import type { Fonte, ItemCatalogo, TipoReferencia, Unidade } from './observacao'

/** Arquivamento é separado do status: arquivar oculta sem apagar nem mudar o status. */
export type SituacaoArquivo = 'ativos' | 'arquivados' | 'todos'

type EmUso<T> = T & { emUso: boolean }

/** Opção de uma classificação (Público da pesquisa → Moradores). Não é CNAE. */
export interface CategoriaCatalogo extends ItemCatalogo {
  classificacaoCodigo: string
  codigoCnae: string | null
}

/** Catálogos da administração; itens nunca são excluídos, só acrescentados ou corrigidos. */
export interface CatalogosAdmin {
  /** Setores do Observatório; somente leitura. */
  setores: EmUso<ItemCatalogo>[]
  /** Somente leitura. */
  unidades: EmUso<Unidade>[]
  fontes: EmUso<Fonte>[]
  classificacoes: EmUso<ItemCatalogo>[]
  categorias: EmUso<CategoriaCatalogo>[]
}

export interface DefinicaoIndicador {
  /** Gerado pelo sistema e preservado ao renomear. */
  codigo: string
  nome: string
  definicao: string
  notaMetodologica: string | null
  unidade: Unidade
  setores: ItemCatalogo[]
  tiposReferenciaPermitidos: TipoReferencia[]
  classificacoesPermitidas: ItemCatalogo[]
  aceitaSemCategoria: boolean
  arquivado: boolean
  /** Dados vinculados, inclusive rascunhos e arquivados. */
  totalDados: number
}

/** Cadastro da definição; o código não é informado. */
export interface DefinicaoEntrada {
  nome: string
  definicao: string
  unidadeCodigo: string
  setores: string[]
  tiposReferenciaPermitidos: TipoReferencia[]
  classificacoesPermitidas: string[]
  aceitaSemCategoria: boolean
  notaMetodologica: string | null
}

/** Somente os campos alterados; `notaMetodologica: null` remove a nota. */
export type DefinicaoCorrecao = Partial<DefinicaoEntrada>

export interface DefinicoesFiltro {
  situacao?: SituacaoArquivo
  setor?: string
  /** Trecho do nome. */
  busca?: string
}

export interface FonteEntrada {
  nome: string
  links: string[]
}

export interface ClassificacaoEntrada {
  nome: string
}

export interface CategoriaEntrada {
  nome: string
  classificacaoCodigo: string
  /** Somente quando informado pela fonte. */
  codigoCnae: string | null
}
