import type { RelatorioPublicoResponseDto } from '@/api/dtos'
import { dominioDoLink } from '@/lib/format'
import type { Relatorio } from '@/models'

/** "2026-10-08" → 8 de outubro no fuso local (new Date("2026-10-08") seria meia-noite UTC, ainda dia 7 no Brasil). */
export function toDataLocal(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

/** `urlArquivo` é o download da API, usado somente quando o relatório não tem link externo. */
export const toRelatorio = (dto: RelatorioPublicoResponseDto, urlArquivo: string): Relatorio => ({
  id: dto.id,
  titulo: dto.titulo,
  numero: dto.numero,
  tipo: dto.tipo,
  fonte: dto.fonte,
  dataPublicacao: dto.data_publicacao ? toDataLocal(dto.data_publicacao) : null,
  periodo: dto.ano === null ? null : { ano: dto.ano, mes: dto.mes },
  demonstracao: dto.demonstracao,
  acesso: dto.link_externo
    ? { tipo: 'link', url: dto.link_externo, destino: dominioDoLink(dto.link_externo) }
    : { tipo: 'arquivo', url: urlArquivo },
})
