import { http } from '@/api/http/client'
import type { LimitesRelatorioResponseDto, RelatorioAdminResponseDto } from '@/api/dtos'
import {
  toLimitesRelatorio,
  toRelatorioAdmin,
  toRelatorioArquivoFormData,
  toRelatorioFormData,
  toRelatorioUpdateDto,
  toRelatoriosAdminQueryDto,
} from '@/api/mappers/relatorio.mapper'
import type { LimitesRelatorio, RelatorioAdmin, RelatorioCorrecao, RelatorioEntrada, RelatoriosAdminFiltro } from '@/models'

const BASE = '/admin/relatorios'

/**
 * O cliente `http` declara `Content-Type: application/json` por padrão e o axios converte um
 * FormData em JSON quando vê esse tipo (defaults/index.js, transformRequest), o que quebraria o
 * upload. Declarar `multipart/form-data` na requisição mantém o FormData; no navegador o axios
 * remove o cabeçalho (helpers/resolveConfig.js) e o próprio navegador acrescenta o boundary.
 */
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 } as const

type AcaoRelatorio = 'publicar' | 'despublicar' | 'arquivar' | 'restaurar'

async function executar(id: number, acao: AcaoRelatorio): Promise<RelatorioAdmin> {
  const { data } = await http.post<RelatorioAdminResponseDto>(`${BASE}/${id}/${acao}`)
  return toRelatorioAdmin(data)
}

export const adminRelatorioService = {
  async limites(): Promise<LimitesRelatorio> {
    const { data } = await http.get<LimitesRelatorioResponseDto>(`${BASE}/limites`)
    return toLimitesRelatorio(data)
  },

  async listar(filtro: RelatoriosAdminFiltro): Promise<RelatorioAdmin[]> {
    const { data } = await http.get<RelatorioAdminResponseDto[]>(BASE, { params: toRelatoriosAdminQueryDto(filtro) })
    return data.map(toRelatorioAdmin)
  },

  async obter(id: number): Promise<RelatorioAdmin> {
    const { data } = await http.get<RelatorioAdminResponseDto>(`${BASE}/${id}`)
    return toRelatorioAdmin(data)
  },

  /** PDF vigente para conferência; exige o token, então não pode ser um link direto. */
  async baixarArquivo(id: number): Promise<Blob> {
    const { data } = await http.get<Blob>(`${BASE}/${id}/arquivo`, { responseType: 'blob' })
    return data
  },

  async criar(entrada: RelatorioEntrada): Promise<RelatorioAdmin> {
    const { data } = await http.post<RelatorioAdminResponseDto>(BASE, toRelatorioFormData(entrada), MULTIPART)
    return toRelatorioAdmin(data)
  },

  async corrigir(id: number, correcao: RelatorioCorrecao): Promise<RelatorioAdmin> {
    const { data } = await http.patch<RelatorioAdminResponseDto>(`${BASE}/${id}`, toRelatorioUpdateDto(correcao))
    return toRelatorioAdmin(data)
  },

  async substituirArquivo(id: number, arquivo: File): Promise<RelatorioAdmin> {
    const { data } = await http.put<RelatorioAdminResponseDto>(`${BASE}/${id}/arquivo`, toRelatorioArquivoFormData(arquivo), MULTIPART)
    return toRelatorioAdmin(data)
  },

  publicar: (id: number) => executar(id, 'publicar'),
  despublicar: (id: number) => executar(id, 'despublicar'),
  arquivar: (id: number) => executar(id, 'arquivar'),
  restaurar: (id: number) => executar(id, 'restaurar'),
}
