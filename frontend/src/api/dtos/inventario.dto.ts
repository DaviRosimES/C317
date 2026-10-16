export interface InventarioQueryDto {
  categoria?: string
  busca?: string
}

export interface ItemInventarioResponseDto {
  id: number
  nome: string
  categoria: string
  localizacao: string
  descricao: string
  ultima_revisao: string
}
