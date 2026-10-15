import { http } from '@/api/http/client'
import type { ItemInventarioResponseDto } from '@/api/dtos'
import { toInventarioQueryDto, toItemInventario } from '@/api/mappers/inventario.mapper'
import type { InventarioFiltro, ItemInventario } from '@/models'

export const inventarioService = {
  async listarPublico(filtro: InventarioFiltro = {}): Promise<ItemInventario[]> {
    const { data } = await http.get<ItemInventarioResponseDto[]>('/inventario', { params: toInventarioQueryDto(filtro) })
    return data.map(toItemInventario)
  },
}
