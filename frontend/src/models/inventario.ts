export interface ItemInventario {
  id: number
  nome: string
  categoria: string
  localizacao: string
  descricao: string
  ultimaRevisao: Date
}

export interface InventarioFiltro {
  categoria?: string
  busca?: string
}
