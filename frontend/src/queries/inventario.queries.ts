import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { inventarioService } from '@/api/services/inventario.service'
import type { InventarioFiltro } from '@/models'

export const inventarioKeys = {
  all: ['inventario'] as const,
  publico: (filtro: InventarioFiltro) => [...inventarioKeys.all, 'publico', filtro] as const,
}

export const useInventarioPublico = (filtro: InventarioFiltro = {}) =>
  useQuery({
    queryKey: inventarioKeys.publico(filtro),
    queryFn: () => inventarioService.listarPublico(filtro),
    placeholderData: keepPreviousData,
  })
