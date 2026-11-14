import type {
  LimitesRelatorioResponseDto,
  RelatorioAdminResponseDto,
  RelatorioPublicoResponseDto,
  RelatorioUpdateRequestDto,
  RelatoriosAdminQueryDto,
} from '@/api/dtos'
import { dominioDoLink, toDataIso } from '@/lib/format'
import type {
  LimitesRelatorio,
  Relatorio,
  RelatorioAdmin,
  RelatorioCorrecao,
  RelatorioEntrada,
  RelatoriosAdminFiltro,
} from '@/models'

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

export const toRelatorioAdmin = (dto: RelatorioAdminResponseDto): RelatorioAdmin => ({
  id: dto.id,
  titulo: dto.titulo,
  numero: dto.numero,
  tipo: dto.tipo,
  fonte: dto.fonte,
  dataPublicacao: dto.data_publicacao ? toDataLocal(dto.data_publicacao) : null,
  periodo: dto.ano === null ? null : { ano: dto.ano, mes: dto.mes },
  status: dto.status,
  arquivado: dto.arquivado,
  demonstracao: dto.demonstracao,
  possuiPdf: dto.possui_pdf,
  arquivoNome: dto.arquivo_nome,
  linkExterno: dto.link_externo,
  conteudo: dto.link_externo
    ? { tipo: 'link', url: dto.link_externo, destino: dominioDoLink(dto.link_externo) }
    : dto.possui_pdf
      ? { tipo: 'pdf', nomeArquivo: dto.arquivo_nome }
      : { tipo: 'ausente' },
})

export const toLimitesRelatorio = (dto: LimitesRelatorioResponseDto): LimitesRelatorio => ({
  tamanhoMaximoBytes: dto.tamanho_maximo_bytes,
  tiposAceitos: dto.tipos_aceitos,
})

export const toRelatoriosAdminQueryDto = (filtro: RelatoriosAdminFiltro): RelatoriosAdminQueryDto => ({
  situacao: filtro.situacao,
  status: filtro.status,
})

/**
 * Multipart do cadastro: só os opcionais preenchidos (vazio = não informado).
 * Não há campo de URL: links externos existem apenas em relatórios legados.
 */
export function toRelatorioFormData(entrada: RelatorioEntrada): FormData {
  const corpo = new FormData()
  corpo.append('titulo', entrada.titulo)
  corpo.append('fonte', entrada.fonte)
  corpo.append('arquivo', entrada.arquivo)
  if (entrada.numero) corpo.append('numero', entrada.numero)
  if (entrada.tipo) corpo.append('tipo', entrada.tipo)
  if (entrada.dataPublicacao) corpo.append('data_publicacao', toDataIso(entrada.dataPublicacao))
  if (entrada.ano !== undefined) corpo.append('ano', String(entrada.ano))
  if (entrada.mes !== undefined) corpo.append('mes', String(entrada.mes))
  return corpo
}

export function toRelatorioArquivoFormData(arquivo: File): FormData {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)
  return corpo
}

export function toRelatorioUpdateDto(correcao: RelatorioCorrecao): RelatorioUpdateRequestDto {
  const dto: RelatorioUpdateRequestDto = {}
  if (correcao.titulo !== undefined) dto.titulo = correcao.titulo
  if (correcao.fonte !== undefined) dto.fonte = correcao.fonte
  if (correcao.numero !== undefined) dto.numero = correcao.numero
  if (correcao.tipo !== undefined) dto.tipo = correcao.tipo
  if (correcao.dataPublicacao !== undefined) {
    dto.data_publicacao = correcao.dataPublicacao ? toDataIso(correcao.dataPublicacao) : null
  }
  if (correcao.ano !== undefined) dto.ano = correcao.ano
  if (correcao.mes !== undefined) dto.mes = correcao.mes
  return dto
}
