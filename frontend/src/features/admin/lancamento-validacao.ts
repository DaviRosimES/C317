import { ApiError } from '@/api/http/api-error'
import { mesmoPeriodo } from '@/lib/periodo'
import type { Lancamento, LancamentoEntrada, TipoIndicador, UnidadeIndicador } from '@/models'

export type Periodicidade = 'mensal' | 'anual'

/** Estado do formulário: os campos ficam como texto até a validação. */
export interface LancamentoRascunho {
  tipo: string
  periodicidade: Periodicidade
  ano: string
  mes: string
  valor: string
  fonte: string
  codigoCnae: string
  demonstracao: boolean
}

export type CampoLancamento = 'tipo' | 'ano' | 'mes' | 'valor' | 'fonte' | 'codigoCnae'
export type ErrosLancamento = Partial<Record<CampoLancamento, string>>

const FONTE_MAX = 1000
const NUMERO = /^-?\d+(?:[.,]\d+)?$/
const MILHAR = /^\d{1,3}(?:\.\d{3})+$/

export function rascunhoVazio(base?: Pick<LancamentoEntrada, 'periodo' | 'fonte' | 'demonstracao'>): LancamentoRascunho {
  return {
    tipo: '',
    periodicidade: base?.periodo.mes === null ? 'anual' : 'mensal',
    ano: String(base?.periodo.ano ?? new Date().getFullYear()),
    mes: base?.periodo.mes ? String(base.periodo.mes) : '',
    valor: '',
    fonte: base?.fonte ?? '',
    codigoCnae: '',
    demonstracao: base?.demonstracao ?? false,
  }
}

export function rascunhoDe(lancamento: Lancamento): LancamentoRascunho {
  return {
    tipo: lancamento.tipo,
    periodicidade: lancamento.periodo.mes === null ? 'anual' : 'mensal',
    ano: String(lancamento.periodo.ano),
    mes: lancamento.periodo.mes === null ? '' : String(lancamento.periodo.mes),
    valor: String(lancamento.valor).replace('.', ','),
    fonte: lancamento.fonte,
    codigoCnae: lancamento.codigoCnae ?? '',
    demonstracao: lancamento.demonstracao,
  }
}

/** Converte "68,25" em "68.25" e aplica as regras da unidade (G1), as mesmas verificadas pela API. */
export function normalizarValor(texto: string, unidade?: UnidadeIndicador): { valor: string } | { erro: string } {
  const bruto = texto.trim()
  if (!bruto) return { erro: 'Informe o valor.' }
  if (MILHAR.test(bruto)) return { erro: 'Digite o número sem separador de milhar (ex.: 1200).' }
  if (!NUMERO.test(bruto)) return { erro: 'Informe um número, usando vírgula para decimais (ex.: 68,25).' }

  const valor = bruto.replace(',', '.')
  const [inteiro, decimais = ''] = valor.replace('-', '').split('.')
  if (decimais.length > 4) return { erro: 'Use no máximo 4 casas decimais.' }
  if (inteiro.replace(/^0+(?=\d)/, '').length + decimais.length > 18) return { erro: 'O valor tem dígitos demais.' }

  const numero = Number(valor)
  if (unidade === 'quantidade' && (numero < 0 || !Number.isInteger(numero))) {
    return { erro: 'Quantidades devem ser números inteiros e não negativos.' }
  }
  if (unidade === 'percentual' && (numero < 0 || numero > 100)) {
    return { erro: 'Percentuais devem estar entre 0 e 100.' }
  }
  return { valor }
}

export function validarLancamento(
  rascunho: LancamentoRascunho,
  tipo: TipoIndicador | undefined,
): { entrada: LancamentoEntrada } | { erros: ErrosLancamento } {
  const erros: ErrosLancamento = {}
  if (!tipo) erros.tipo = 'Selecione o tipo de indicador.'

  const ano = Number(rascunho.ano.trim())
  if (!/^\d{4}$/.test(rascunho.ano.trim()) || ano < 1900 || ano > 2100) erros.ano = 'Informe um ano entre 1900 e 2100.'
  if (rascunho.periodicidade === 'mensal' && !rascunho.mes) erros.mes = 'Selecione o mês de referência.'

  const valor = normalizarValor(rascunho.valor, tipo?.unidade)
  if ('erro' in valor) erros.valor = valor.erro

  const fonte = rascunho.fonte.trim()
  if (!fonte) erros.fonte = 'Informe a fonte do valor.'
  else if (fonte.length > FONTE_MAX) erros.fonte = 'A fonte deve ter no máximo 1.000 caracteres.'

  if (tipo?.escopo === 'cnae' && !rascunho.codigoCnae) erros.codigoCnae = 'Selecione o CNAE deste lançamento.'

  if (!tipo || 'erro' in valor || Object.keys(erros).length) return { erros }
  return {
    entrada: {
      tipo: tipo.codigo,
      valor: valor.valor,
      periodo: { ano, mes: rascunho.periodicidade === 'anual' ? null : Number(rascunho.mes) },
      fonte,
      // Totais municipais não recebem CNAE: o campo só existe para tipos com recorte por CNAE.
      codigoCnae: tipo.escopo === 'cnae' ? rascunho.codigoCnae : null,
      demonstracao: rascunho.demonstracao,
    },
  }
}

const CAMPOS_API: Record<string, CampoLancamento> = {
  tipo: 'tipo',
  ano: 'ano',
  mes: 'mes',
  valor: 'valor',
  fonte: 'fonte',
  codigo_cnae: 'codigoCnae',
}

/** Erros de formato (422 do Pydantic) associados aos campos do formulário. */
export function errosDaApi(erro: unknown): ErrosLancamento {
  const erros: ErrosLancamento = {}
  if (!(erro instanceof ApiError)) return erros
  for (const [campo, mensagem] of Object.entries(erro.fieldErrors)) {
    const alvo = CAMPOS_API[campo]
    if (alvo) erros[alvo] ??= mensagem
  }
  return erros
}

export const ehConflito = (erro: unknown) => erro instanceof ApiError && erro.status === 409

/** Lançamento existente com o mesmo tipo, período e CNAE (a API responde 409 nesse caso). */
export function encontrarConflito(lancamentos: Lancamento[] | undefined, entrada: LancamentoEntrada, ignorarId?: number) {
  return lancamentos?.find(
    (l) =>
      l.id !== ignorarId &&
      l.tipo === entrada.tipo &&
      mesmoPeriodo(l.periodo, entrada.periodo) &&
      l.codigoCnae === entrada.codigoCnae &&
      l.estabelecimentoId === null,
  )
}
