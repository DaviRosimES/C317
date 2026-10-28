/** Contratos das observações da M6 (V5/V6): backend/app/schemas/observacao.py. */

export type TipoReferenciaDto = 'anual' | 'mensal' | 'acumulada' | 'levantamento' | 'retrato'
export type QualificadorDto = 'igual' | 'maior_que'
export type StatusObservacaoDto = 'rascunho' | 'publicado'

export interface ItemCatalogoDto {
  codigo: string
  nome: string
}

export interface TerritorioDto extends ItemCatalogoDto {
  /** municipio, regional ou base_cadastral; novos tipos podem surgir pelo catálogo. */
  tipo: string
}

export interface CategoriaDto extends ItemCatalogoDto {
  classificacao: string
  codigo_cnae: string | null
}

export interface UnidadeDto extends ItemCatalogoDto {
  inteira: boolean
  /** Limite superior; nulo quando não há. */
  maximo: number | null
  /** Casas decimais usadas somente na apresentação. */
  casas_exibicao: number
}

export interface FonteDto extends ItemCatalogoDto {
  links: string[]
}

type ComPublicadosDto<T> = T & { com_dados_publicados: boolean }

export interface CatalogosResponseDto {
  temas: ComPublicadosDto<ItemCatalogoDto>[]
  indicadores: ComPublicadosDto<ItemCatalogoDto>[]
  categorias: ComPublicadosDto<CategoriaDto>[]
  territorios: ComPublicadosDto<TerritorioDto>[]
  unidades: ComPublicadosDto<UnidadeDto>[]
  fontes: ComPublicadosDto<FonteDto>[]
}

export interface ReferenciaResponseDto {
  tipo: TipoReferenciaDto
  ano_inicio: number
  ano_fim: number
  mes: number | null
  /** Data ISO (AAAA-MM-DD), somente em retrato. */
  data_extracao?: string | null
  rotulo: string
}

export interface ObservacaoPublicaResponseDto {
  id: string
  indicador: ItemCatalogoDto
  territorio: TerritorioDto
  categoria: CategoriaDto | null
  codigo_cnae: string | null
  referencia: ReferenciaResponseDto
  /** Decimal exato, como recebido. */
  valor: string
  /** Arredondado meio para cima nas casas_exibicao da unidade. */
  valor_exibicao: string
  qualificador: QualificadorDto
  unidade: UnidadeDto
  fonte: FonteDto
  temas: ItemCatalogoDto[]
  notas: string[]
  demonstracao: boolean
}

export interface ObservacaoAdminResponseDto extends ObservacaoPublicaResponseDto {
  status: StatusObservacaoDto
  divulgacao_bloqueada: boolean
  motivo_bloqueio: string | null
  publicado_por: number | null
  publicado_em: string | null
  /** Origem na planilha (aba, célula, valor_xml…) ou registro administrativo (origem, usuario_id…). */
  proveniencias: Record<string, unknown>[]
}

export interface ReferenciaRequestDto {
  tipo: TipoReferenciaDto
  ano_inicio: number
  ano_fim: number
  mes: number | null
  data_extracao: string | null
}

export interface ObservacaoCreateRequestDto {
  indicador_codigo: string
  territorio_codigo: string
  categoria_codigo: string | null
  codigo_cnae: string | null
  referencia: ReferenciaRequestDto
  /** Decimal em texto, sem limite de casas nem notação científica. */
  valor: string
  unidade_codigo: string
  qualificador: QualificadorDto
  fonte_codigo: string
  temas: string[]
  notas: string[]
}

/** Correção dos campos fora da identidade; apenas os enviados mudam. */
export interface ObservacaoUpdateRequestDto {
  valor?: string
  qualificador?: QualificadorDto
  notas?: string[]
}

export interface BloqueioRequestDto {
  motivo: string
}

export interface ObservacoesQueryDto {
  tema?: string[]
  indicador?: string[]
  territorio?: string[]
  categoria?: string[]
  referencia_tipo?: TipoReferenciaDto[]
  /** Referências de um único ano; não inclui acumulados. */
  ano?: number
  ano_inicio?: number
  ano_fim?: number
}

export interface ObservacoesAdminQueryDto extends ObservacoesQueryDto {
  status?: StatusObservacaoDto
  divulgacao_bloqueada?: boolean
}
