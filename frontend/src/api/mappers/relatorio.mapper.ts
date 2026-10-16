import type { RelatorioPublicoResponseDto } from '@/api/dtos'
import type { Relatorio } from '@/models'

/** "2026-10-08" → 8 de outubro no fuso local (new Date("2026-10-08") seria meia-noite UTC, ainda dia 7 no Brasil). */
export function toDataLocal(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

export const toRelatorio = (dto: RelatorioPublicoResponseDto, urlArquivo: string): Relatorio => ({
  id: dto.id,
  titulo: dto.titulo,
  fonte: dto.fonte,
  dataPublicacao: toDataLocal(dto.data_publicacao),
  periodo: { ano: dto.ano, mes: dto.mes },
  demonstracao: dto.demonstracao,
  urlArquivo,
})
