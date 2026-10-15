import type { UnidadeIndicador } from '@/models/catalogo'

const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const relativeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'always' })

/** 1428 → "1.428" */
export const formatNumber = (value: number) => numberFormatter.format(value)

export const formatPercent = (value: number) => percentFormatter.format(value)

export function formatValorIndicador(valor: number, unidade: UnidadeIndicador) {
  return unidade === 'percentual' ? `${numberFormatter.format(valor)}%` : numberFormatter.format(valor)
}

export function formatVariacao(atual: number, anterior: number, unidade: UnidadeIndicador) {
  if (unidade === 'percentual') {
    const diff = atual - anterior
    const sinal = diff > 0 ? '+' : diff < 0 ? '−' : ''
    return `${sinal}${numberFormatter.format(Math.abs(diff))} p.p.`
  }
  if (anterior === 0) return null
  return formatPercent((atual - anterior) / anterior)
}

export const formatDate = (date: Date) => dateFormatter.format(date).replace(/ de /g, ' ').replace('.', '')

export function formatRelativo(date: Date, now = new Date()) {
  const dias = Math.round((date.getTime() - now.getTime()) / 86_400_000)
  if (dias === 0) return 'hoje'
  if (Math.abs(dias) >= 30) return relativeFormatter.format(Math.round(dias / 30), 'month')
  return relativeFormatter.format(dias, 'day')
}
