import { ApiError } from '@/api/http/api-error'
import { compararDecimal, ehInteiro, lerDecimal } from '@/lib/decimal'
import { toDataIso } from '@/lib/format'
import type {
  CatalogosAdmin,
  DadoCorrecao,
  DadoEntrada,
  DadoIndicadorAdmin,
  DefinicaoIndicador,
  Qualificador,
  Referencia,
  TipoReferencia,
  Unidade,
} from '@/models'
import { TEXTOS_ADMIN } from './textos'

/** Estado do formulário: os campos ficam como texto até a validação. */
export interface DadoRascunho {
  indicador: string
  /** Vazio até o administrador escolher; o indicador que exige categoria força 'categoria'. */
  recorte: '' | 'sem' | 'categoria'
  classificacao: string
  categoria: string
  referenciaTipo: TipoReferencia | ''
  ano: string
  mes: string
  anoInicio: string
  anoFim: string
  /** AAAA-MM-DD do campo de data. */
  dataExtracao: string
  valor: string
  qualificador: Qualificador
  fonte: string
  /** Uma nota por linha. */
  notas: string
}

export type CampoDado =
  | 'indicador'
  | 'categoria'
  | 'referenciaTipo'
  | 'ano'
  | 'mes'
  | 'anoInicio'
  | 'anoFim'
  | 'dataExtracao'
  | 'valor'
  | 'fonte'
  | 'notas'
export type ErrosDado = Partial<Record<CampoDado, string>>

/** Ordem dos campos na tela, para levar o foco ao primeiro erro. */
export const ORDEM_CAMPOS: CampoDado[] = [
  'indicador',
  'categoria',
  'referenciaTipo',
  'ano',
  'mes',
  'anoInicio',
  'anoFim',
  'dataExtracao',
  'valor',
  'fonte',
  'notas',
]

/** Limite de cada nota na API, no cadastro e na correção. */
const NOTA_MAX = 2000

export const erroDasNotas = (notas: string[]) =>
  notas.some((nota) => nota.length > NOTA_MAX) ? 'Cada nota pode ter até 2.000 caracteres.' : undefined

export const lerNotas = (texto: string) =>
  texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)

/** Sem ano ou mês preenchido de antemão: a referência precisa vir da fonte. */
export function rascunhoVazio(base?: Partial<DadoRascunho>): DadoRascunho {
  return {
    indicador: '',
    recorte: '',
    classificacao: '',
    categoria: '',
    referenciaTipo: '',
    ano: '',
    mes: '',
    anoInicio: '',
    anoFim: '',
    dataExtracao: '',
    valor: '',
    qualificador: 'igual',
    fonte: '',
    notas: '',
    ...base,
  }
}

/** Para "Adicionar outro": mantém indicador e fonte; referência, categoria e valor voltam vazios. */
export const rascunhoDoLote = (anterior: DadoRascunho): DadoRascunho =>
  rascunhoVazio({ indicador: anterior.indicador, fonte: anterior.fonte })

/** Campos do formulário preenchidos com o dado atual, para a correção; o valor mantém todas as casas. */
export function rascunhoDoDado(d: DadoIndicadorAdmin): DadoRascunho {
  const r = d.referencia
  const intervalo = r.tipo === 'acumulada' || r.tipo === 'levantamento'
  return rascunhoVazio({
    indicador: d.indicador.codigo,
    recorte: d.categoria ? 'categoria' : 'sem',
    classificacao: d.categoria?.classificacaoCodigo ?? '',
    categoria: d.categoria?.codigo ?? '',
    referenciaTipo: r.tipo,
    ano: r.tipo === 'anual' || r.tipo === 'mensal' ? String(r.anoInicio) : '',
    mes: r.mes ? String(r.mes) : '',
    anoInicio: intervalo ? String(r.anoInicio) : '',
    anoFim: intervalo ? String(r.anoFim) : '',
    dataExtracao: r.dataExtracao ? toDataIso(r.dataExtracao) : '',
    valor: d.valor.replace('.', ','),
    qualificador: d.qualificador,
    fonte: d.fonte.codigo,
    notas: d.notas.join('\n'),
  })
}

/** Regras da unidade, as mesmas aplicadas pela API e pelo banco. */
export function validarValor(texto: string, unidade: Unidade | undefined): { valor: string } | { erro: string } {
  const lido = lerDecimal(texto)
  if ('erro' in lido || !unidade) return lido
  if (unidade.inteira && !ehInteiro(lido.valor)) return { erro: `A unidade “${unidade.nome}” exige um número inteiro.` }
  if (unidade.maximo !== null && compararDecimal(lido.valor, String(unidade.maximo)) > 0) {
    return { erro: `A unidade “${unidade.nome}” vai até ${String(unidade.maximo).replace('.', ',')}.` }
  }
  return lido
}

/** Ano de 1900 a 2100, como na API; `null` quando o texto não é um ano válido. */
export function lerAno(texto: string) {
  const ano = Number(texto.trim())
  return /^\d{4}$/.test(texto.trim()) && ano >= 1900 && ano <= 2100 ? ano : null
}

export const ANO_INVALIDO = 'Informe um ano entre 1900 e 2100.'

function validarReferencia(r: DadoRascunho, definicao: DefinicaoIndicador, erros: ErrosDado): Referencia | null {
  if (!r.referenciaTipo) {
    erros.referenciaTipo = TEXTOS_ADMIN.referenciaIncompleta
    return null
  }
  if (!definicao.tiposReferenciaPermitidos.includes(r.referenciaTipo)) {
    erros.referenciaTipo = 'O indicador não aceita este tipo de referência.'
    return null
  }
  switch (r.referenciaTipo) {
    case 'anual':
    case 'mensal': {
      const ano = lerAno(r.ano)
      if (ano === null) erros.ano = ANO_INVALIDO
      if (r.referenciaTipo === 'mensal' && !r.mes) erros.mes = 'Selecione o mês de referência.'
      if (ano === null || (r.referenciaTipo === 'mensal' && !r.mes)) return null
      return { tipo: r.referenciaTipo, anoInicio: ano, anoFim: ano, mes: r.referenciaTipo === 'mensal' ? Number(r.mes) : null, dataExtracao: null }
    }
    case 'acumulada':
    case 'levantamento': {
      const inicio = lerAno(r.anoInicio)
      const fim = lerAno(r.anoFim)
      if (inicio === null) erros.anoInicio = ANO_INVALIDO
      if (fim === null) erros.anoFim = ANO_INVALIDO
      if (inicio === null || fim === null) return null
      if (inicio > fim) {
        erros.anoFim = 'O ano final deve ser igual ou posterior ao inicial.'
        return null
      }
      return { tipo: r.referenciaTipo, anoInicio: inicio, anoFim: fim, mes: null, dataExtracao: null }
    }
    case 'retrato': {
      const [ano, mes, dia] = r.dataExtracao.split('-').map(Number)
      const data = ano ? new Date(ano, mes - 1, dia) : null
      if (!data || Number.isNaN(data.getTime()) || ano < 1900 || ano > 2100) {
        erros.dataExtracao = 'Informe a data da extração da base.'
        return null
      }
      return { tipo: 'retrato', anoInicio: ano, anoFim: ano, mes: null, dataExtracao: data }
    }
  }
}

export interface CamposValidados {
  categoriaCodigo: string | null
  referencia: Referencia
  valor: string
  qualificador: Qualificador
  fonteCodigo: string
  notas: string[]
}

/** Valida o que o formulário preenche; unidade e tipos de referência vêm da definição. */
export function validarCampos(
  r: DadoRascunho,
  definicao: DefinicaoIndicador,
  catalogos: CatalogosAdmin,
): { campos: CamposValidados } | { erros: ErrosDado } {
  const erros: ErrosDado = {}

  let categoriaCodigo: string | null = null
  const soTotal = definicao.aceitaSemCategoria && !definicao.classificacoesPermitidas.length
  if ((r.recorte === 'sem' || soTotal) && definicao.aceitaSemCategoria) {
    categoriaCodigo = null
  } else if (r.recorte === 'categoria' || !definicao.aceitaSemCategoria) {
    const categoria = catalogos.categorias.find((c) => c.codigo === r.categoria)
    if (!categoria) erros.categoria = 'Selecione a categoria do dado.'
    else categoriaCodigo = categoria.codigo
  } else {
    erros.categoria = 'Escolha uma categoria ou informe que o valor é o total informado pela fonte.'
  }

  const referencia = validarReferencia(r, definicao, erros)

  const valor = validarValor(r.valor, definicao.unidade)
  if ('erro' in valor) erros.valor = valor.erro

  if (!catalogos.fontes.some((f) => f.codigo === r.fonte)) erros.fonte = 'Selecione a fonte do valor.'

  const notas = lerNotas(r.notas)
  const erroNotas = erroDasNotas(notas)
  if (erroNotas) erros.notas = erroNotas

  if (!referencia || 'erro' in valor || Object.keys(erros).length) return { erros }
  return {
    campos: { categoriaCodigo, referencia, valor: valor.valor, qualificador: r.qualificador, fonteCodigo: r.fonte, notas },
  }
}

export function validarDado(
  r: DadoRascunho,
  definicao: DefinicaoIndicador | undefined,
  catalogos: CatalogosAdmin,
): { entrada: DadoEntrada } | { erros: ErrosDado } {
  if (!definicao || definicao.arquivado) return { erros: { indicador: 'Selecione um indicador ativo.' } }
  const resultado = validarCampos(r, definicao, catalogos)
  if ('erros' in resultado) return resultado
  return { entrada: { indicadorCodigo: definicao.codigo, ...resultado.campos } }
}

const mesmaReferencia = (a: Referencia, b: Referencia) =>
  a.tipo === b.tipo &&
  a.anoInicio === b.anoInicio &&
  a.anoFim === b.anoFim &&
  (a.mes ?? null) === (b.mes ?? null) &&
  (a.dataExtracao ? toDataIso(a.dataExtracao) : null) === (b.dataExtracao ? toDataIso(b.dataExtracao) : null)

/** Só o que mudou em relação ao dado salvo; vazio quando nada foi alterado. */
export function diferencas(dado: DadoIndicadorAdmin, campos: CamposValidados): DadoCorrecao {
  const correcao: DadoCorrecao = {}
  if (campos.categoriaCodigo !== (dado.categoria?.codigo ?? null)) correcao.categoriaCodigo = campos.categoriaCodigo
  if (!mesmaReferencia(campos.referencia, dado.referencia)) correcao.referencia = campos.referencia
  if (compararDecimal(campos.valor, dado.valor) !== 0) correcao.valor = campos.valor
  if (campos.qualificador !== dado.qualificador) correcao.qualificador = campos.qualificador
  if (campos.fonteCodigo !== dado.fonte.codigo) correcao.fonteCodigo = campos.fonteCodigo
  if (campos.notas.join('\n') !== dado.notas.join('\n')) correcao.notas = campos.notas
  return correcao
}

/** Campo da tela para o nome do campo no corpo enviado à API. */
function campoDaApi(campo: string, tipo: TipoReferencia | ''): CampoDado | undefined {
  const [raiz, filho] = campo.split('.')
  switch (raiz) {
    case 'indicador_codigo':
      return 'indicador'
    case 'categoria_codigo':
      return 'categoria'
    case 'valor':
    case 'qualificador':
      return 'valor'
    case 'fonte_codigo':
      return 'fonte'
    case 'notas':
      return 'notas'
    case 'referencia': {
      const intervalo = tipo === 'acumulada' || tipo === 'levantamento'
      if (filho === 'ano_inicio') return intervalo ? 'anoInicio' : 'ano'
      if (filho === 'ano_fim') return intervalo ? 'anoFim' : 'ano'
      if (filho === 'mes') return 'mes'
      if (filho === 'data_extracao') return 'dataExtracao'
      return 'referenciaTipo'
    }
  }
}

/** Erros de formato (422 do Pydantic) associados aos campos; remove o prefixo técnico "Value error, ". */
export function errosDaApi(erro: unknown, tipo: TipoReferencia | ''): ErrosDado {
  const erros: ErrosDado = {}
  if (!(erro instanceof ApiError)) return erros
  for (const [campo, mensagem] of Object.entries(erro.fieldErrors)) {
    const alvo = campoDaApi(campo, tipo)
    if (alvo) erros[alvo] ??= mensagem.replace(/^Value error, /, '')
  }
  return erros
}

/** Id do dado existente, que a API informa no fim da mensagem de duplicidade: "(dado <id>)". */
export function idDoDadoExistente(erro: unknown) {
  if (!(erro instanceof ApiError) || erro.status !== 409) return undefined
  return erro.message.match(/\(dado ([0-9a-f]{64})\)/)?.[1]
}
