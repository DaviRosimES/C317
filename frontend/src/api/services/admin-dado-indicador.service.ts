import { http } from '@/api/http/client'
import type { BloqueioDadoRequestDto, DadoAdminResponseDto } from '@/api/dtos'
import {
  toDadoCreateDto,
  toDadoIndicadorAdmin,
  toDadoUpdateDto,
  toDadosAdminQueryDto,
} from '@/api/mappers/dado-indicador.mapper'
import type { DadoCorrecao, DadoEntrada, DadoIndicadorAdmin, DadosAdminFiltro } from '@/models'

const URL = '/admin/dados-indicadores'
const item = (id: string) => `${URL}/${encodeURIComponent(id)}`

/** Dados do indicador (exige sessão administrativa). Um dado arquivado responde 409 a edição e publicação. */
export const adminDadoIndicadorService = {
  /** Padrão: ativos, em qualquer status, inclusive de indicadores arquivados. */
  async listar(filtro: DadosAdminFiltro = {}): Promise<DadoIndicadorAdmin[]> {
    const { data } = await http.get<DadoAdminResponseDto[]>(URL, { params: toDadosAdminQueryDto(filtro) })
    return data.map(toDadoIndicadorAdmin)
  },

  async obter(id: string): Promise<DadoIndicadorAdmin> {
    const { data } = await http.get<DadoAdminResponseDto>(item(id))
    return toDadoIndicadorAdmin(data)
  },

  /** Cria como rascunho; 409 quando a combinação indicador + categoria + referência + fonte já existe. */
  async criar(entrada: DadoEntrada): Promise<DadoIndicadorAdmin> {
    const { data } = await http.post<DadoAdminResponseDto>(URL, toDadoCreateDto(entrada))
    return toDadoIndicadorAdmin(data)
  },

  /** Preserva o id; em um publicado, vale na consulta pública imediatamente. */
  async corrigir(id: string, correcao: DadoCorrecao): Promise<DadoIndicadorAdmin> {
    const { data } = await http.patch<DadoAdminResponseDto>(item(id), toDadoUpdateDto(correcao))
    return toDadoIndicadorAdmin(data)
  },

  async publicar(id: string): Promise<DadoIndicadorAdmin> {
    const { data } = await http.post<DadoAdminResponseDto>(`${item(id)}/publicar`)
    return toDadoIndicadorAdmin(data)
  },

  /** Volta a rascunho sem apagar nada. */
  async despublicar(id: string): Promise<DadoIndicadorAdmin> {
    const { data } = await http.post<DadoAdminResponseDto>(`${item(id)}/despublicar`)
    return toDadoIndicadorAdmin(data)
  },

  /** Preserva status e bloqueio. */
  async arquivar(id: string): Promise<DadoIndicadorAdmin> {
    const { data } = await http.post<DadoAdminResponseDto>(`${item(id)}/arquivar`)
    return toDadoIndicadorAdmin(data)
  },

  async restaurar(id: string): Promise<DadoIndicadorAdmin> {
    const { data } = await http.post<DadoAdminResponseDto>(`${item(id)}/restaurar`)
    return toDadoIndicadorAdmin(data)
  },

  async bloquear(id: string, motivo: string): Promise<DadoIndicadorAdmin> {
    const body: BloqueioDadoRequestDto = { motivo }
    const { data } = await http.post<DadoAdminResponseDto>(`${item(id)}/bloquear`, body)
    return toDadoIndicadorAdmin(data)
  },

  async desbloquear(id: string): Promise<DadoIndicadorAdmin> {
    const { data } = await http.post<DadoAdminResponseDto>(`${item(id)}/desbloquear`)
    return toDadoIndicadorAdmin(data)
  },
}
