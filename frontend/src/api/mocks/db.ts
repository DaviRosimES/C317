import type { ItemInventarioResponseDto } from '@/api/dtos'

const diasAtras = (dias: number) => {
  const data = new Date()
  data.setDate(data.getDate() - dias)
  return data.toISOString()
}

export const inventario: ItemInventarioResponseDto[] = [
  {
    id: 1,
    nome: 'Museu Histórico Municipal',
    categoria: 'Atrativo cultural',
    localizacao: 'Centro',
    descricao: 'Acervo sobre a história do município e da formação do polo tecnológico.',
    ultima_revisao: diasAtras(60),
  },
  {
    id: 2,
    nome: 'Caminhos da Mantiqueira',
    categoria: 'Rota / natureza',
    localizacao: 'Zona rural',
    descricao: 'Roteiro de trilhas e mirantes na Serra da Mantiqueira.',
    ultima_revisao: diasAtras(120),
  },
  {
    id: 3,
    nome: 'Centro de Eventos',
    categoria: 'Equipamento',
    localizacao: 'Centro',
    descricao: 'Espaço para feiras, congressos e eventos de médio porte.',
    ultima_revisao: diasAtras(30),
  },
  {
    id: 4,
    nome: 'Feira de produtores locais',
    categoria: 'Evento / serviço',
    localizacao: 'Praça central',
    descricao: 'Feira semanal de produtos da agricultura familiar e artesanato.',
    ultima_revisao: diasAtras(90),
  },
]
