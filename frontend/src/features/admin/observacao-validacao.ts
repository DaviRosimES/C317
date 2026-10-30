import { ApiError } from '@/api/http/api-error'
import { compararDecimal, ehInteiro, lerDecimal } from '@/lib/decimal'
import type {
  Catalogos,
  ObservacaoAdmin,
  ObservacaoEntrada,
  Qualificador,
  Referencia,
  TipoReferencia,
  Unidade,
} from '@/models'

/** Estado do formulário de cadastro: os campos ficam como texto até a validação. */
export interface ObservacaoRascunho {
  indicador: string
  temas: string[]
  territorio: string
  /** 'total' não tem categoria; 'categoria' exige um recorte da fonte. */
  recorte: 'total' | 'categoria'
  classificacao: string
  categoria: string
  /** Vazio quando a fonte não informa CNAE. */
  codigoCnae: string
  referenciaTipo: TipoReferencia | ''
  ano: string
  mes: string
  anoInicio: string
  anoFim: string
  /** AAAA-MM-DD do campo de data. */
  dataExtracao: string
  valor: string
  qualificador: Qualificador
  unidade: string
  fonte: string
  /** Uma nota por linha. */
  notas: string
}

export type CampoObservacao =
  | 'indicador'
  | 'temas'
  | 'territorio'
  | 'categoria'
  | 'codigoCnae'
  | 'referenciaTipo'
  | 'ano'
  | 'mes'
  | 'anoInicio'
  | 'anoFim'
  | 'dataExtracao'
  | 'unidade'
  | 'valor'
  | 'fonte'
  | 'notas'
export type ErrosObservacao = Partial<Record<CampoObservacao, string>>

/** Ordem dos campos na tela, para levar o foco ao primeiro erro. */
export const ORDEM_CAMPOS: CampoObservacao[] = [
  'indicador',
  'temas',
  'territorio',
  'categoria',
  'codigoCnae',
  'referenciaTipo',
  'ano',
  'mes',
  'anoInicio',
  'anoFim',
  'dataExtracao',
  'unidade',
  'valor',
  'fonte',
  'notas',
]

/** Limite de cada nota na API (`Nota`), no cadastro e na correção. */
const NOTA_MAX = 2000

export const erroDasNotas = (notas: string[]) =>
  notas.some((nota) => nota.length > NOTA_MAX) ? 'Cada nota pode ter até 2.000 caracteres.' : undefined

/** Sem ano ou mês preenchido de antemão: a referência precisa vir da fonte. */
export function rascunhoVazio(base?: Partial<ObservacaoRascunho>): ObservacaoRascunho {
  return {
    indicador: '',
    temas: [],
    territorio: '',
    recorte: 'total',
    classificacao: '',
    categoria: '',
    codigoCnae: '',
    referenciaTipo: '',
    ano: '',
    mes: '',
    anoInicio: '',
    anoFim: '',
    dataExtracao: '',
    valor: '',
    qualificador: 'igual',
    unidade: '',
    fonte: '',
    notas: '',
    ...base,
  }
}

/**
 * Mantém fonte, território, unidade e temas para cadastrar outra observação do mesmo lote.
 * A referência volta vazia: cada valor precisa ter a sua confirmada na fonte.
 */
export const rascunhoDoLote = (anterior: ObservacaoRascunho): ObservacaoRascunho =>
  rascunhoVazio({
    temas: anterior.temas,
    territorio: anterior.territorio,
    unidade: anterior.unidade,
    fonte: anterior.fonte,
  })

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

function validarReferencia(r: ObservacaoRascunho, erros: ErrosObservacao): Referencia | null {
  switch (r.referenciaTipo) {
    case '':
      erros.referenciaTipo = 'Selecione o tipo de referência informado pela fonte.'
      return null
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
      if (r.referenciaTipo === 'acumulada' && inicio === fim) {
        erros.anoFim = 'Um acumulado cobre mais de um ano; para um único ano use a referência anual.'
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

export function validarObservacao(
  r: ObservacaoRascunho,
  catalogos: Catalogos,
): { entrada: ObservacaoEntrada } | { erros: ErrosObservacao } {
  const erros: ErrosObservacao = {}
  if (!catalogos.indicadores.some((i) => i.codigo === r.indicador)) erros.indicador = 'Selecione o indicador.'
  if (!r.temas.length) erros.temas = 'Marque ao menos um tema em que a observação aparece.'
  if (!catalogos.territorios.some((t) => t.codigo === r.territorio)) erros.territorio = 'Selecione o território.'
  if (r.recorte === 'categoria' && !catalogos.categorias.some((c) => c.codigo === r.categoria)) {
    erros.categoria = 'Selecione a categoria da fonte, ou escolha “Total” se o valor não tem recorte.'
  }

  const referencia = validarReferencia(r, erros)

  const unidade = catalogos.unidades.find((u) => u.codigo === r.unidade)
  if (!unidade) erros.unidade = 'Selecione a unidade do valor.'
  const valor = validarValor(r.valor, unidade)
  if ('erro' in valor) erros.valor = valor.erro

  if (!catalogos.fontes.some((f) => f.codigo === r.fonte)) erros.fonte = 'Selecione a fonte do valor.'

  const notas = lerNotas(r.notas)
  const erroNotas = erroDasNotas(notas)
  if (erroNotas) erros.notas = erroNotas

  if (!referencia || 'erro' in valor || Object.keys(erros).length) return { erros }
  return {
    entrada: {
      indicadorCodigo: r.indicador,
      territorioCodigo: r.territorio,
      categoriaCodigo: r.recorte === 'categoria' ? r.categoria : null,
      // CNAE só quando a fonte o informa; nunca deduzido da categoria.
      codigoCnae: r.codigoCnae || null,
      referencia,
      valor: valor.valor,
      unidadeCodigo: r.unidade,
      qualificador: r.qualificador,
      fonteCodigo: r.fonte,
      temas: r.temas,
      notas,
    },
  }
}

export const lerNotas = (texto: string) =>
  texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)

const CAMPOS_API: Record<string, CampoObservacao> = {
  indicador_codigo: 'indicador',
  territorio_codigo: 'territorio',
  categoria_codigo: 'categoria',
  codigo_cnae: 'codigoCnae',
  referencia: 'referenciaTipo',
  valor: 'valor',
  unidade_codigo: 'unidade',
  fonte_codigo: 'fonte',
  temas: 'temas',
  notas: 'notas',
  qualificador: 'valor',
}

/** Erros de formato (422 do Pydantic) associados aos campos; "referencia.ano_inicio" vai para a referência. */
export function errosDaApi(erro: unknown): ErrosObservacao {
  const erros: ErrosObservacao = {}
  if (!(erro instanceof ApiError)) return erros
  for (const [campo, mensagem] of Object.entries(erro.fieldErrors)) {
    const alvo = CAMPOS_API[campo.split('.')[0]]
    if (alvo) erros[alvo] ??= mensagem.replace(/^Value error, /, '')
  }
  return erros
}

export const ehConflito = (erro: unknown) => erro instanceof ApiError && erro.status === 409

/** Observação existente com a mesma identidade (indicador, território, categoria, referência, unidade e fonte). */
export function mesmaIdentidade(observacao: ObservacaoAdmin, entrada: ObservacaoEntrada) {
  const a = observacao.referencia
  const b = entrada.referencia
  return (
    observacao.indicador.codigo === entrada.indicadorCodigo &&
    observacao.territorio.codigo === entrada.territorioCodigo &&
    (observacao.categoria?.codigo ?? null) === entrada.categoriaCodigo &&
    observacao.unidade.codigo === entrada.unidadeCodigo &&
    observacao.fonte.codigo === entrada.fonteCodigo &&
    a.tipo === b.tipo &&
    a.anoInicio === b.anoInicio &&
    a.anoFim === b.anoFim &&
    a.mes === b.mes &&
    a.dataExtracao?.getTime() === b.dataExtracao?.getTime()
  )
}
