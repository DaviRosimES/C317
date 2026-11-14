import { z } from 'zod'

export const dashboardSearchSchema = z.object({
  ano: z.coerce.number().int().min(1900).max(2100).optional().catch(undefined),
  mes: z.coerce.number().int().min(1).max(12).optional().catch(undefined),
  cnae: z.string().optional().catch(undefined),
})
export type DashboardSearch = z.infer<typeof dashboardSearchSchema>

const codigoCatalogo = z.string().min(1).max(200)

export const consultaSearchSchema = z.object({
  tema: codigoCatalogo.optional().catch(undefined),
  territorio: codigoCatalogo.optional().catch(undefined),
  ref: z
    .string()
    .regex(/^(tipo:[a-z_]+|[a-z_]+:\d{4}-\d{4}(-\d{2})?)$/)
    .optional()
    .catch(undefined),
  categoria: codigoCatalogo.optional().catch(undefined),
  cnae: z
    .string()
    .regex(/^[0-9]{4}-[0-9]\/[0-9]{2}$/)
    .optional()
    .catch(undefined),
})
export type ConsultaSearch = z.infer<typeof consultaSearchSchema>

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
