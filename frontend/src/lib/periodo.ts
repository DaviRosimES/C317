import type { Periodo } from '@/models/periodo'

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const mesCurto = (mes: number) => MESES_CURTOS[mes - 1] ?? String(mes)

export const mesLongo = (mes: number) => MESES_LONGOS[mes - 1] ?? String(mes)

export function formatPeriodo(periodo: Periodo, estilo: 'curto' | 'longo' = 'curto') {
  if (periodo.mes == null) return estilo === 'curto' ? `${periodo.ano} (anual)` : `Ano de ${periodo.ano}`
  return estilo === 'curto' ? `${mesCurto(periodo.mes)}/${periodo.ano}` : `${mesLongo(periodo.mes)} de ${periodo.ano}`
}

export const toAnoMes = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}`

export const periodoKey = (periodo: Periodo) =>
  periodo.mes == null ? String(periodo.ano) : toAnoMes(periodo.ano, periodo.mes)

export function parsePeriodoKey(key: string): Periodo | null {
  const match = /^(\d{4})(?:-(\d{2}))?$/.exec(key)
  if (!match) return null
  return { ano: Number(match[1]), mes: match[2] ? Number(match[2]) : null }
}

export const comparePeriodo = (a: Periodo, b: Periodo) => a.ano - b.ano || (a.mes ?? 13) - (b.mes ?? 13)

export const mesmoPeriodo = (a: Periodo, b: Periodo) => a.ano === b.ano && (a.mes ?? null) === (b.mes ?? null)

