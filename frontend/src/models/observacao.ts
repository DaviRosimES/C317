/** Observações da M6: um valor por indicador, território, recorte, referência, unidade e fonte. */

export type TipoReferencia = 'anual' | 'mensal' | 'acumulada' | 'levantamento' | 'retrato'
/** 'maior_que' preserva limites informados pela fonte ("mais de 1.000"). */
export type Qualificador = 'igual' | 'maior_que'
export type StatusObservacao = 'rascunho' | 'publicado'

export interface ItemCatalogo {
  codigo: string
  nome: string
}

export interface Territorio extends ItemCatalogo {
  tipo: string
}

/** Recorte da fonte (setor Sebrae, porte, hospedagem…). Não é CNAE. */
export interface Categoria extends ItemCatalogo {
  classificacao: string
  codigoCnae: string | null
}

export interface Unidade extends ItemCatalogo {
  inteira: boolean
  maximo: number | null
  casasExibicao: number
}

export interface Fonte extends ItemCatalogo {
  links: string[]
}

type ComPublicados<T> = T & { comDadosPublicados: boolean }

export interface Catalogos {
  temas: ComPublicados<ItemCatalogo>[]
  indicadores: ComPublicados<ItemCatalogo>[]
  categorias: ComPublicados<Categoria>[]
  territorios: ComPublicados<Territorio>[]
  unidades: ComPublicados<Unidade>[]
  fontes: ComPublicados<Fonte>[]
}

/** Não existe referência para período desconhecido: um valor sem período confirmado não é cadastrado. */
export interface Referencia {
  tipo: TipoReferencia
  anoInicio: number
  anoFim: number
  /** Somente na referência mensal. */
  mes: number | null
  /** Somente no retrato (extração datada de uma base). */
  dataExtracao: Date | null
}

export interface ReferenciaRotulada extends Referencia {
  /** Texto da API que distingue anual, acumulado, levantamento etc. */
  rotulo: string
}

export interface Observacao {
  id: string
  indicador: ItemCatalogo
  territorio: Territorio
  categoria: Categoria | null
  /** CNAE é classificação própria e opcional, nunca inferida da categoria. */
  codigoCnae: string | null
  referencia: ReferenciaRotulada
  /** Decimal exato em texto ("0.0328478422252442"); não passa por number para não perder precisão. */
  valor: string
  /** Valor arredondado pela API nas casas de exibição da unidade. */
  valorExibicao: string
  qualificador: Qualificador
  unidade: Unidade
  fonte: Fonte
  temas: ItemCatalogo[]
  notas: string[]
  demonstracao: boolean
}

/** Linha da planilha recebida (carga da G5) ou registro de cadastro/correção pela área administrativa. */
export type Proveniencia =
  | {
      tipo: 'planilha'
      aba: string
      celula: string
      indicadorOriginal: string | null
      recorteOriginal: string | null
      referenciaOriginal: string | null
      valorOriginal: string | null
    }
  | {
      tipo: 'registro'
      origem: string
      usuarioId: number | null
      registradoEm: Date | null
      /** Valores substituídos por uma correção. */
      anterior: Record<string, unknown> | null
    }

export interface ObservacaoAdmin extends Observacao {
  status: StatusObservacao
  divulgacaoBloqueada: boolean
  motivoBloqueio: string | null
  publicadoPor: number | null
  publicadoEm: Date | null
  proveniencias: Proveniencia[]
}

/** Dados do formulário de cadastro; `valor` é a string decimal enviada à API ("68.25"). */
export interface ObservacaoEntrada {
  indicadorCodigo: string
  territorioCodigo: string
  categoriaCodigo: string | null
  codigoCnae: string | null
  referencia: Referencia
  valor: string
  unidadeCodigo: string
  qualificador: Qualificador
  fonteCodigo: string
  temas: string[]
  notas: string[]
}

/** Campos corrigíveis; os da identidade não mudam. */
export interface ObservacaoCorrecao {
  valor?: string
  qualificador?: Qualificador
  notas?: string[]
}

export interface ObservacoesFiltro {
  temas?: string[]
  indicadores?: string[]
  territorios?: string[]
  categorias?: string[]
  referenciaTipos?: TipoReferencia[]
  ano?: number
  anoInicio?: number
  anoFim?: number
}

export interface ObservacoesAdminFiltro extends ObservacoesFiltro {
  status?: StatusObservacao
  divulgacaoBloqueada?: boolean
}
