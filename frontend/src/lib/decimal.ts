/**
 * Decimais em texto, sem passar por number: a API aceita qualquer quantidade de casas e
 * o valor recebido não pode ser arredondado silenciosamente.
 */

const NUMERO = /^\d+(?:[.,]\d+)?$/
// "1.200" é ambíguo (milhar ou decimal); "0.075" não.
const MILHAR = /^[1-9]\d{0,2}(?:\.\d{3})+$/
const MAXIMO_CARACTERES = 60

/** "0,0328478422252442" → "0.0328478422252442", com todas as casas informadas. */
export function lerDecimal(texto: string): { valor: string } | { erro: string } {
  const bruto = texto.trim()
  if (!bruto) return { erro: 'Informe o valor.' }
  if (bruto.startsWith('-')) return { erro: 'O valor não pode ser negativo.' }
  if (MILHAR.test(bruto)) return { erro: 'Digite o número sem separador de milhar (ex.: 5818).' }
  if (!NUMERO.test(bruto)) return { erro: 'Informe um número, usando vírgula para decimais (ex.: 0,0328).' }
  if (bruto.length > MAXIMO_CARACTERES) return { erro: 'O valor tem dígitos demais.' }
  return { valor: bruto.replace(',', '.') }
}

/** Valor da API ("0.0328478422252442") no formato do campo ("0,0328478422252442"). */
export const decimalParaCampo = (valor: string) => valor.replace('.', ',')

export const ehInteiro = (valor: string) => /^\d+(?:\.0+)?$/.test(valor)

function partes(valor: string) {
  const [inteiro, fracao = ''] = valor.split('.')
  return [inteiro.replace(/^0+(?=\d)/, ''), fracao.replace(/0+$/, '')] as const
}

/** Compara decimais não negativos em texto: -1, 0 ou 1. */
export function compararDecimal(a: string, b: string) {
  const [ia, fa] = partes(a)
  const [ib, fb] = partes(b)
  if (ia.length !== ib.length) return ia.length > ib.length ? 1 : -1
  if (ia !== ib) return ia > ib ? 1 : -1
  const casas = Math.max(fa.length, fb.length)
  const [pa, pb] = [fa.padEnd(casas, '0'), fb.padEnd(casas, '0')]
  return pa === pb ? 0 : pa > pb ? 1 : -1
}

/** Arredonda meio para cima, como a apresentação da API (`valor_exibicao`). Só para exibir. */
export function arredondarDecimal(valor: string, casas: number) {
  const [inteiro, fracao = ''] = valor.split('.')
  const digitos = BigInt(inteiro + fracao.padEnd(casas + 1, '0').slice(0, casas + 1))
  const arredondado = (digitos / 10n + (digitos % 10n >= 5n ? 1n : 0n)).toString().padStart(casas + 1, '0')
  return casas ? `${arredondado.slice(0, -casas)}.${arredondado.slice(-casas)}` : arredondado
}
