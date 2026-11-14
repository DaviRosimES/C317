import { ApiError } from '@/api/http/api-error'
import type { DefinicaoCorrecao, DefinicaoEntrada, DefinicaoIndicador, TipoReferencia } from '@/models'

export const NOME_MAX = 300
export const TEXTO_MAX = 5000

export type CampoDefinicao =
  | 'nome'
  | 'definicao'
  | 'unidade'
  | 'setores'
  | 'tipos'
  | 'classificacoes'
  | 'aceitaSemCategoria'
  | 'nota'

export type ErrosDefinicao = Partial<Record<CampoDefinicao, string>>

/** Ordem do formulário: o primeiro campo com erro recebe o foco. */
export const ORDEM_CAMPOS: CampoDefinicao[] = [
  'nome',
  'definicao',
  'unidade',
  'setores',
  'tipos',
  'classificacoes',
  'aceitaSemCategoria',
  'nota',
]

export const IDS: Record<CampoDefinicao, string> = {
  nome: 'definicao-nome',
  definicao: 'definicao-texto',
  unidade: 'definicao-unidade',
  setores: 'definicao-setores',
  tipos: 'definicao-tipos',
  classificacoes: 'definicao-classificacoes',
  aceitaSemCategoria: 'definicao-sem-categoria',
  nota: 'definicao-nota',
}

/** Estado do formulário (campos de texto como digitados). */
export interface DefinicaoRascunho {
  nome: string
  definicao: string
  unidade: string
  setores: string[]
  tipos: TipoReferencia[]
  classificacoes: string[]
  aceitaSemCategoria: boolean
  nota: string
}

export const rascunhoVazio = (): DefinicaoRascunho => ({
  nome: '',
  definicao: '',
  unidade: '',
  setores: [],
  tipos: [],
  classificacoes: [],
  aceitaSemCategoria: true,
  nota: '',
})

export const rascunhoDaDefinicao = (d: DefinicaoIndicador): DefinicaoRascunho => ({
  nome: d.nome,
  definicao: d.definicao,
  unidade: d.unidade.codigo,
  setores: d.setores.map((s) => s.codigo),
  tipos: d.tiposReferenciaPermitidos,
  classificacoes: d.classificacoesPermitidas.map((c) => c.codigo),
  aceitaSemCategoria: d.aceitaSemCategoria,
  nota: d.notaMetodologica ?? '',
})

export function validarDefinicao(r: DefinicaoRascunho): { erros: ErrosDefinicao } | { entrada: DefinicaoEntrada } {
  const erros: ErrosDefinicao = {}
  const nome = r.nome.trim()
  const definicao = r.definicao.trim()
  const nota = r.nota.trim()

  if (!nome) erros.nome = 'Informe o nome do indicador.'
  else if (nome.length > NOME_MAX) erros.nome = `O nome pode ter até ${NOME_MAX} caracteres.`
  if (!definicao) erros.definicao = 'Descreva o que o indicador mede.'
  else if (definicao.length > TEXTO_MAX) erros.definicao = `O texto pode ter até ${TEXTO_MAX.toLocaleString('pt-BR')} caracteres.`
  if (!r.unidade) erros.unidade = 'Selecione a unidade.'
  if (!r.setores.length) erros.setores = 'Selecione ao menos um Setor do Observatório.'
  if (!r.tipos.length) erros.tipos = 'Selecione ao menos um tipo de referência.'
  if (!r.aceitaSemCategoria && !r.classificacoes.length) {
    erros.classificacoes = 'Selecione ao menos uma classificação ou marque que o indicador aceita dado sem categoria.'
  }
  if (nota.length > TEXTO_MAX) erros.nota = `A nota pode ter até ${TEXTO_MAX.toLocaleString('pt-BR')} caracteres.`

  if (Object.keys(erros).length) return { erros }
  return {
    entrada: {
      nome,
      definicao,
      unidadeCodigo: r.unidade,
      setores: r.setores,
      tiposReferenciaPermitidos: r.tipos,
      classificacoesPermitidas: r.classificacoes,
      aceitaSemCategoria: r.aceitaSemCategoria,
      notaMetodologica: nota || null,
    },
  }
}

const mesmoConjunto = (a: string[], b: string[]) => a.length === b.length && a.every((item) => b.includes(item))

/** Somente os campos que mudaram em relação à definição aberta; vazio quando nada mudou. */
export function correcaoDe(atual: DefinicaoIndicador, entrada: DefinicaoEntrada): DefinicaoCorrecao {
  const correcao: DefinicaoCorrecao = {}
  if (entrada.nome !== atual.nome) correcao.nome = entrada.nome
  if (entrada.definicao !== atual.definicao) correcao.definicao = entrada.definicao
  if (entrada.unidadeCodigo !== atual.unidade.codigo) correcao.unidadeCodigo = entrada.unidadeCodigo
  if (!mesmoConjunto(entrada.setores, atual.setores.map((s) => s.codigo))) correcao.setores = entrada.setores
  if (!mesmoConjunto(entrada.tiposReferenciaPermitidos, atual.tiposReferenciaPermitidos)) {
    correcao.tiposReferenciaPermitidos = entrada.tiposReferenciaPermitidos
  }
  if (!mesmoConjunto(entrada.classificacoesPermitidas, atual.classificacoesPermitidas.map((c) => c.codigo))) {
    correcao.classificacoesPermitidas = entrada.classificacoesPermitidas
  }
  if (entrada.aceitaSemCategoria !== atual.aceitaSemCategoria) correcao.aceitaSemCategoria = entrada.aceitaSemCategoria
  if (entrada.notaMetodologica !== atual.notaMetodologica) correcao.notaMetodologica = entrada.notaMetodologica
  return correcao
}

const CAMPOS_API: Record<string, CampoDefinicao> = {
  nome: 'nome',
  definicao: 'definicao',
  unidade_codigo: 'unidade',
  setores: 'setores',
  tipos_referencia_permitidos: 'tipos',
  classificacoes_permitidas: 'classificacoes',
  aceita_sem_categoria: 'aceitaSemCategoria',
  nota_metodologica: 'nota',
}

/** Erros de formato (422 do Pydantic) associados aos campos; "setores.0" vai para os setores. */
export function errosDaApi(erro: unknown): ErrosDefinicao {
  const erros: ErrosDefinicao = {}
  if (!(erro instanceof ApiError)) return erros
  for (const [campo, mensagem] of Object.entries(erro.fieldErrors)) {
    const alvo = CAMPOS_API[campo.split('.')[0]]
    if (alvo) erros[alvo] ??= mensagem.replace(/^Value error, /, '')
  }
  return erros
}
