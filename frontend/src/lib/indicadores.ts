import type { Indicador, Periodo } from '@/models'
import { comparePeriodo, mesmoPeriodo } from './periodo'

export const ordenarPorPeriodo = <T extends { periodo: Periodo }>(lista: T[]) =>
  [...lista].sort((a, b) => comparePeriodo(a.periodo, b.periodo))

export function serieDoTipo(indicadores: Indicador[], tipo: string, codigoCnae: string | null = null) {
  return ordenarPorPeriodo(indicadores.filter((i) => i.tipo === tipo && i.codigoCnae === codigoCnae))
}

export function valoresPorCnae(indicadores: Indicador[], tipo: string, periodo?: Periodo) {
  const porCnae = new Map<string, Indicador>()
  const doTipo = indicadores.filter((i) => i.tipo === tipo && i.codigoCnae && (!periodo || mesmoPeriodo(i.periodo, periodo)))
  for (const indicador of ordenarPorPeriodo(doTipo)) porCnae.set(indicador.codigoCnae!, indicador)
  return [...porCnae.values()].sort((a, b) => b.valor - a.valor)
}

export function referenciaDaSerie(serie: Indicador[], mes?: number) {
  if (mes) {
    const indice = serie.findIndex((i) => i.periodo.mes === mes)
    return { atual: indice >= 0 ? serie[indice] : undefined, anterior: indice > 0 ? serie[indice - 1] : undefined }
  }
  const atual = serie.at(-1)
  return { atual, anterior: serie.length > 1 ? serie[0] : undefined }
}

export const fontesDe = (lista: Indicador[]) => lista.map((i) => i.fonte)
export const temDemonstracao = (lista: Indicador[]) => lista.some((i) => i.demonstracao)
