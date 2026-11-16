import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { consultaIndicadoresService } from '@/api/services/consulta-indicadores.service'
import type { ConsultaFiltro } from '@/models'
import { consultaKeys } from './consulta.queries'

/** Dentro de `consultaKeys.all`: publicar, arquivar ou bloquear na administração invalida a consulta. */
export const consultaIndicadoresKeys = {
  opcoes: (setor: string | undefined) => [...consultaKeys.all, 'opcoes', setor ?? null] as const,
  resultado: (filtro: ConsultaFiltro) =>
    [...consultaKeys.all, 'resultado', { setor: filtro.setor ?? null, periodo: filtro.periodo ?? null }] as const,
}

export const opcoesConsultaQueryOptions = (setor?: string) =>
  queryOptions({
    queryKey: consultaIndicadoresKeys.opcoes(setor),
    queryFn: () => consultaIndicadoresService.opcoes(setor),
  })

export const resultadoConsultaQueryOptions = (filtro: ConsultaFiltro) =>
  queryOptions({
    queryKey: consultaIndicadoresKeys.resultado(filtro),
    queryFn: () => consultaIndicadoresService.consultar(filtro),
    placeholderData: keepPreviousData,
  })

export const useOpcoesConsulta = (setor?: string, enabled = true) =>
  useQuery({ ...opcoesConsultaQueryOptions(setor), enabled })

export const useResultadoConsulta = (filtro: ConsultaFiltro, enabled = true) =>
  useQuery({ ...resultadoConsultaQueryOptions(filtro), enabled })
