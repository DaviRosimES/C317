import { http } from '@/api/http/client'
import type { IndicadorResponseDto, IndicadorUpdateRequestDto } from '@/api/dtos'
import { toIndicadoresAdminQueryDto, toIndicadorRequestDto, toLancamento } from '@/api/mappers/lancamento.mapper'
import type { Lancamento, LancamentoEntrada, LancamentosFiltro } from '@/models'

const URL = '/admin/indicadores'

/** Cadastro e publicação de lançamentos (exige sessão administrativa). */
export const lancamentoService = {
  async listar(filtro: LancamentosFiltro = {}): Promise<Lancamento[]> {
    const { data } = await http.get<IndicadorResponseDto[]>(URL, { params: toIndicadoresAdminQueryDto(filtro) })
    return data.map(toLancamento)
  },

  async obter(id: number): Promise<Lancamento> {
    const { data } = await http.get<IndicadorResponseDto>(`${URL}/${id}`)
    return toLancamento(data)
  },

  /** Cria como rascunho: fica fora da consulta pública até ser publicado. */
  async criar(entrada: LancamentoEntrada): Promise<Lancamento> {
    const { data } = await http.post<IndicadorResponseDto>(URL, toIndicadorRequestDto(entrada))
    return toLancamento(data)
  },

  /** Um lançamento publicado continua publicado após a correção. */
  async atualizar(id: number, entrada: LancamentoEntrada): Promise<Lancamento> {
    const body: IndicadorUpdateRequestDto = toIndicadorRequestDto(entrada)
    const { data } = await http.patch<IndicadorResponseDto>(`${URL}/${id}`, body)
    return toLancamento(data)
  },

  async publicar(id: number): Promise<Lancamento> {
    const { data } = await http.post<IndicadorResponseDto>(`${URL}/${id}/publicar`)
    return toLancamento(data)
  },
}
