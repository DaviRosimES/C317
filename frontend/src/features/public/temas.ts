import type { TemaIndicador } from '@/lib/schemas'

interface Tema {
  label: string
  series: string[]
  comparativo?: string
}

export const TEMAS: Record<TemaIndicador, Tema> = {
  'visao-geral': { label: 'Visão geral', series: ['numero_leitos', 'empresas_ativas', 'empregos_formais', 'numero_patentes'], comparativo: 'empresas_por_setor' },
  hospedagem: { label: 'Hospedagem', series: ['numero_leitos', 'numero_hoteis', 'ocupacao_media_hoteis'] },
  empresas: { label: 'Empresas', series: ['empresas_ativas'], comparativo: 'empresas_por_setor' },
  empregos: { label: 'Empregos', series: ['empregos_formais'], comparativo: 'empregos_por_setor' },
  visitantes: { label: 'Visitantes', series: [] },
}

export const RESUMO = [
  { tipo: 'empresas_ativas', cor: 'bg-brand-sky' },
  { tipo: 'numero_leitos', cor: 'bg-brand-cyan' },
  { tipo: 'empregos_formais', cor: 'bg-brand-lilac' },
  { tipo: 'ocupacao_media_hoteis', cor: 'bg-brand-yellow' },
]
