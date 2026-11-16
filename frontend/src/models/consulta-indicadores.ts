/** Consulta pública por Setor e Ano/Período (V9). Só dados elegíveis: a API aplica a regra de divulgação. */
import type { CategoriaDoDado, ReferenciaDado } from './dado-indicador'
import type { Fonte, ItemCatalogo, Qualificador, TipoReferencia, Unidade } from './observacao'

/** Setor do Observatório (Dados gerais, Turismo…). Não é CNAE nem Setor econômico (Sebrae). */
export type SetorObservatorio = ItemCatalogo

/** Referência completa oferecida no filtro Ano/Período: anual 2024 ≠ acumulado 2000–2024. */
export interface PeriodoOpcao {
  chave: string
  rotulo: string
  tipo: TipoReferencia
  anoInicio: number
  anoFim: number
  mes: number | null
  dataExtracao: Date | null
}

export interface OpcoesConsulta {
  setores: SetorObservatorio[]
  periodos: PeriodoOpcao[]
}

export interface DadoPublico {
  id: string
  /** Nula para o total sem categoria. */
  categoria: CategoriaDoDado | null
  fonte: Fonte
  referencia: ReferenciaDado
  /** Decimal exato em texto; não passa por number, exceto para desenhar o gráfico. */
  valor: string
  qualificador: Qualificador
  notas: string[]
  demonstracao: boolean
}

export interface IndicadorConsulta {
  codigo: string
  nome: string
  definicao: string
  notaMetodologica: string | null
  unidade: Unidade
  setores: SetorObservatorio[]
  classificacoes: ItemCatalogo[]
  /** Somente os dados que passaram por Setor e Ano/Período. */
  dados: DadoPublico[]
}

export interface ResultadoConsulta {
  setor: SetorObservatorio | null
  periodo: PeriodoOpcao | null
  indicadores: IndicadorConsulta[]
}

/** Filtros gerais da página; ausente = Todos. */
export interface ConsultaFiltro {
  setor?: string
  periodo?: string
}
