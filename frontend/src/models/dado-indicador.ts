/** Dados do indicador (V9): cada valor recebido, com referência, fonte, categoria quando houver e notas. */
import type { SituacaoArquivo } from './definicao'
import type { Fonte, ItemCatalogo, Qualificador, Referencia, ReferenciaRotulada, Unidade } from './observacao'

export type StatusPublicacao = 'rascunho' | 'publicado'

export interface CategoriaDoDado extends ItemCatalogo {
  classificacaoCodigo: string
  classificacaoNome: string
  codigoCnae: string | null
}

export interface ReferenciaDado extends ReferenciaRotulada {
  /** Chave do Ano/Período usada na consulta pública (ex.: `anual-2024`). */
  chave: string
}

/** Onde o valor recebido está na fonte; não registra quem alterou o cadastro. */
export interface OrigemDado {
  arquivo: string | null
  aba: string | null
  celula: string | null
  valorOriginal: string | null
  recorteOriginal: string | null
  referenciaOriginal: string | null
}

export interface DadoIndicadorAdmin {
  /** Estável; preservado em todas as correções. */
  id: string
  indicador: ItemCatalogo & { arquivado: boolean }
  /** Herdada da definição. */
  unidade: Unidade
  /** Santa Rita do Sapucaí. */
  territorio: ItemCatalogo
  /** Nula para o dado sem categoria (total informado pela fonte). */
  categoria: CategoriaDoDado | null
  fonte: Fonte
  referencia: ReferenciaDado
  /** Decimal exato em texto ("0.270702596283992"); não passa por number. */
  valor: string
  qualificador: Qualificador
  notas: string[]
  origens: OrigemDado[]
  status: StatusPublicacao
  arquivado: boolean
  divulgacaoBloqueada: boolean
  motivoBloqueio: string | null
  demonstracao: boolean
  /** Elegível para a consulta pública agora (publicado, ativo, sem bloqueio, indicador ativo). */
  visivelPublicamente: boolean
}

/** Novo dado em rascunho. Território, unidade e setores vêm da definição. */
export interface DadoEntrada {
  indicadorCodigo: string
  categoriaCodigo: string | null
  referencia: Referencia
  /** Decimal em texto com ponto ("44.5"). */
  valor: string
  qualificador: Qualificador
  fonteCodigo: string
  notas: string[]
}

/** Somente os campos alterados; `categoriaCodigo: null` remove a categoria. */
export interface DadoCorrecao {
  categoriaCodigo?: string | null
  referencia?: Referencia
  valor?: string
  qualificador?: Qualificador
  fonteCodigo?: string
  notas?: string[]
}

export interface DadosAdminFiltro {
  indicador?: string
  situacao?: SituacaoArquivo
  status?: StatusPublicacao
}
