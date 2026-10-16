import type { InventarioQueryDto, ItemInventarioResponseDto } from '@/api/dtos'
import type { InventarioFiltro, ItemInventario } from '@/models'

export const toItemInventario = (dto: ItemInventarioResponseDto): ItemInventario => ({
  id: dto.id,
  nome: dto.nome,
  categoria: dto.categoria,
  localizacao: dto.localizacao,
  descricao: dto.descricao,
  ultimaRevisao: new Date(dto.ultima_revisao),
})

export const toInventarioQueryDto = (filtro: InventarioFiltro): InventarioQueryDto => ({
  categoria: filtro.categoria || undefined,
  busca: filtro.busca?.trim() || undefined,
})
