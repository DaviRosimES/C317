export type UnidadeIndicador = 'quantidade' | 'percentual' | 'outra'

export interface Cnae {
  id: number
  codigo: string
  nome: string
  fonte: string | null
  provisorio: boolean
  rotas: string[]
}

export interface TipoIndicador {
  codigo: string
  nome: string
  descricao: string
  unidade: UnidadeIndicador
  escopo: 'municipal' | 'cnae' | 'estabelecimento'
  fonteReferencia: string | null
  provisorio: boolean
}

export interface Rota {
  codigo: string
  nome: string
  descricao: string
  cnaes: string[]
  composicaoPendente: boolean
}
