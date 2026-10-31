import type { UnidadeIndicador } from '@/models/catalogo'
import type { Qualificador } from '@/models/observacao'

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

export function formatValorIndicador(valor: number, unidade: UnidadeIndicador, unidadeOriginal?: string) {
  if (unidade === 'percentual') return `${numberFormatter.format(valor)}%`
  if (unidade === 'outra' && unidadeOriginal) return `${numberFormatter.format(valor)} ${unidadeOriginal}`
  return numberFormatter.format(valor)
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

/** Data local → "2026-10-08" (atributo dateTime e contratos da API). */
export const toDataIso = (data: Date) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`

/** Decimal exato em texto ("5818.25") → "5.818,25", sem converter para number nem arredondar. */
export function formatDecimal(valor: string) {
  const [inteiro, fracao] = valor.split('.')
  const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return fracao ? `${agrupado},${fracao}` : agrupado
}

/** "45,2% dos entrevistados", "R$ 1.850.000,00", "mais de 1.000 pessoas". A unidade vem do catálogo. */
export function formatValorObservacao(valor: string, unidade: { nome: string }, qualificador: Qualificador = 'igual') {
  const numero = formatDecimal(valor)
  const texto =
    unidade.nome === 'R$'
      ? `R$ ${numero}`
      : unidade.nome.startsWith('%')
        ? `${numero}${unidade.nome}`
        : `${numero} ${unidade.nome}`
  return qualificador === 'maior_que' ? `mais de ${texto}` : texto
}

/** "https://drive.google.com/open?id=…" → "drive.google.com"; um link malformado aparece como recebido. */
export function dominioDoLink(link: string) {
  try {
    return new URL(link).hostname
  } catch {
    return link
  }
}
