import { inventario } from './db'
import type { MockRoute } from './http'

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const contem = (alvo: string, busca: unknown) =>
  typeof busca !== 'string' || !busca.trim() || normalizar(alvo).includes(normalizar(busca.trim()))

export const handlers: MockRoute[] = [
  {
    method: 'GET',
    path: '/inventario',
    handler: ({ query }) => ({
      data: inventario
        .filter((item) => !query.categoria || item.categoria === query.categoria)
        .filter((item) => contem(`${item.nome} ${item.descricao} ${item.localizacao}`, query.busca))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    }),
  },
]
