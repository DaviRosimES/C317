import { z } from 'zod'

/** Parâmetro da URL como texto: `?setor=123` chega como número e não pode ser descartado sem aviso. */
const textoDaUrl = z.preprocess(
  (valor) => (valor == null || valor === '' ? undefined : String(valor)),
  z.string().trim().min(1).max(300).optional(),
)

/**
 * Consulta pública de Indicadores. Setor e Ano/Período são os únicos filtros gerais (códigos da API,
 * validados pela página contra `/consulta/opcoes`); `indicador` é o detalhe aberto.
 * Os parâmetros antigos (cidade, tema, recortes e filtros do Dashboard) são lidos só para serem retirados com aviso:
 * não existe consulta de outra cidade.
 */
export const indicadoresSearchSchema = z.object({
  setor: textoDaUrl.catch(undefined),
  periodo: textoDaUrl.catch(undefined),
  indicador: textoDaUrl.catch(undefined),
  territorio: z.unknown().optional(),
  tema: z.unknown().optional(),
  ref: z.unknown().optional(),
  categoria: z.unknown().optional(),
  cnae: z.unknown().optional(),
  ano: z.unknown().optional(),
  mes: z.unknown().optional(),
})
export type IndicadoresSearch = z.infer<typeof indicadoresSearchSchema>

export const PARAMETROS_ANTIGOS = ['territorio', 'tema', 'ref', 'categoria', 'cnae', 'ano', 'mes'] as const

export const motivosLogin = ['expirada', 'saiu', 'sem-permissao'] as const
export type MotivoLogin = (typeof motivosLogin)[number]

export const loginSearchSchema = z.object({
  /** Tela administrativa a abrir após o login; aceita somente caminhos internos de /admin. */
  redirect: z
    .string()
    .regex(/^\/admin(?:[/?#]|$)/)
    .refine((caminho) => !caminho.startsWith('/admin/login'))
    .optional()
    .catch(undefined),
  motivo: z.enum(motivosLogin).optional().catch(undefined),
})
export type LoginSearch = z.infer<typeof loginSearchSchema>

/** Arquivamento é separado do status: listagens administrativas filtram ativos, arquivados ou todos. */
export const situacoesArquivo = ['ativos', 'arquivados', 'todos'] as const
const statusPublicacao = ['rascunho', 'publicado'] as const

/** Filtros da listagem de Dados do indicador; o código do indicador vem da API. */
export const dadosSearchSchema = z.object({
  indicador: z.string().min(1).optional().catch(undefined),
  situacao: z.enum(situacoesArquivo).optional().catch(undefined),
  status: z.enum(statusPublicacao).optional().catch(undefined),
})
export type DadosSearch = z.infer<typeof dadosSearchSchema>

/** Indicador pré-selecionado ao cadastrar um dado (`/admin/dados/novo?indicador=`). */
export const novoDadoSearchSchema = z.object({
  indicador: z.string().min(1).optional().catch(undefined),
})
export type NovoDadoSearch = z.infer<typeof novoDadoSearchSchema>

/** Filtros da listagem administrativa de indicadores; o setor é um código do catálogo da API. */
export const definicoesSearchSchema = z.object({
  situacao: z.enum(situacoesArquivo).optional().catch(undefined),
  setor: z.string().min(1).optional().catch(undefined),
  busca: z.string().trim().min(1).max(300).optional().catch(undefined),
})
export type DefinicoesSearch = z.infer<typeof definicoesSearchSchema>

/** Filtros da listagem administrativa de relatórios. */
export const relatoriosAdminSearchSchema = z.object({
  situacao: z.enum(situacoesArquivo).optional().catch(undefined),
  status: z.enum(statusPublicacao).optional().catch(undefined),
})
export type RelatoriosAdminSearch = z.infer<typeof relatoriosAdminSearchSchema>
