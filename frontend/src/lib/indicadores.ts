import type { Indicador, Periodo } from '@/models'
import { comparePeriodo } from './periodo'

export const ordenarPorPeriodo = <T extends { periodo: Periodo }>(lista: T[]) =>
  [...lista].sort((a, b) => comparePeriodo(a.periodo, b.periodo))

export function serieDoTipo(indicadores: Indicador[], tipo: string, codigoCnae: string | null = null) {
  return ordenarPorPeriodo(indicadores.filter((i) => i.tipo === tipo && i.codigoCnae === codigoCnae))
}

export function ultimosPorCnae(indicadores: Indicador[], tipo: string) {
  const porCnae = new Map<string, Indicador>()
  for (const indicador of ordenarPorPeriodo(indicadores.filter((i) => i.tipo === tipo && i.codigoCnae))) {
    porCnae.set(indicador.codigoCnae!, indicador)
  }
  return [...porCnae.values()].sort((a, b) => b.valor - a.valor)
}

export function fechamentoAnual(serie: Indicador[]) {
  const porAno = new Map<number, Indicador>()
  for (const indicador of ordenarPorPeriodo(serie)) porAno.set(indicador.periodo.ano, indicador)
  return [...porAno.values()]
}

export const fontesDe = (lista: Indicador[]) => lista.map((i) => i.fonte)
export const temDemonstracao = (lista: Indicador[]) => lista.some((i) => i.demonstracao)
