/**
 * Regras da consulta pública por Setor e Ano/Período (V9), independentes de indicador: nenhum código,
 * categoria ou fonte é fixado aqui. Um indicador novo aparece com as mesmas visões.
 */
import { arredondarDecimal } from '@/lib/decimal'
import { formatDecimal, formatValorObservacao } from '@/lib/format'
import type { DadoPublico, Fonte, IndicadorConsulta, ItemCatalogo, ReferenciaDado, Unidade } from '@/models'

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Arredonda só para exibir, nas casas da unidade; um valor com menos casas aparece como recebido (44,5%). */
export function valorExibido(valor: string, unidade: Unidade) {
  const casas = valor.split('.')[1]?.length ?? 0
  return casas > unidade.casasExibicao ? arredondarDecimal(valor, unidade.casasExibicao) : valor
}

/** O valor exibido difere do decimal recebido (a tabela mostra os dois). */
export const foiArredondado = (dado: DadoPublico, unidade: Unidade) => valorExibido(dado.valor, unidade) !== dado.valor

/** "44,5% dos entrevistados", "mais de 1.000 pessoas". */
export const textoDoValor = (dado: DadoPublico, unidade: Unidade) =>
  formatValorObservacao(valorExibido(dado.valor, unidade), unidade, dado.qualificador)

/** Rótulo sobre a coluna do gráfico: só o número ("5", "mais de 1.000"); a unidade fica na legenda e no tooltip. */
export const textoCurto = (dado: DadoPublico, unidade: Unidade) =>
  `${dado.qualificador === 'maior_que' ? 'mais de ' : ''}${formatDecimal(valorExibido(dado.valor, unidade))}`

/** Somente para o comprimento das barras e colunas; o texto continua vindo do decimal exato. */
export const valorNumerico = (dado: DadoPublico) => Number(dado.valor)

/** "Público da pesquisa: Moradores" ou "Total (sem recorte)". */
export const rotuloRecorte = (dado: DadoPublico) =>
  dado.categoria ? `${dado.categoria.classificacaoNome}: ${dado.categoria.nome}` : 'Total (sem recorte)'

/** Rótulo do eixo de uma série: "2024" (anual) ou "mar/2024" (mensal). */
export const rotuloCurto = (r: ReferenciaDado) => (r.tipo === 'mensal' && r.mes ? `${MESES_CURTOS[r.mes - 1]}/${r.anoInicio}` : String(r.anoInicio))

const ordemReferencia = (r: ReferenciaDado) => r.anoInicio * 100 + (r.mes ?? 0)

export function unicosPorCodigo<T extends { codigo: string }>(itens: T[]) {
  return [...new Map(itens.map((item) => [item.codigo, item])).values()]
}

export const fontesDe = (dados: DadoPublico[]): Fonte[] => unicosPorCodigo(dados.map((d) => d.fonte))

export const notasDe = (dados: DadoPublico[]) => [...new Set(dados.flatMap((d) => d.notas))]

export const referenciasDe = (dados: DadoPublico[]) => [...new Map(dados.map((d) => [d.referencia.chave, d.referencia])).values()]

// ---------------------------------------------------------------------------------------------
// Recortes locais: fonte, classificação e categoria valem só para o indicador aberto.

/** Valor da classificação que seleciona apenas os dados sem categoria (o total informado pela fonte). */
export const SEM_RECORTE = '__sem-recorte'

export interface RecorteLocal {
  fonte?: string
  /** Código da classificação ou `SEM_RECORTE`; ausente = todos os dados. */
  classificacao?: string
  categoria?: string
}

const daFonte = (dados: DadoPublico[], fonte?: string) => (fonte ? dados.filter((d) => d.fonte.codigo === fonte) : dados)

const daClassificacao = (dados: DadoPublico[], classificacao?: string) =>
  !classificacao
    ? dados
    : classificacao === SEM_RECORTE
      ? dados.filter((d) => !d.categoria)
      : dados.filter((d) => d.categoria?.classificacaoCodigo === classificacao)

export function aplicarRecorteLocal(dados: DadoPublico[], recorte: RecorteLocal) {
  const filtrados = daClassificacao(daFonte(dados, recorte.fonte), recorte.classificacao)
  return recorte.categoria ? filtrados.filter((d) => d.categoria?.codigo === recorte.categoria) : filtrados
}

/** Opções oferecidas a partir dos dados que já passaram pelos filtros gerais, encadeadas: fonte → classificação → categoria. */
export function opcoesDoRecorte(dados: DadoPublico[], recorte: RecorteLocal) {
  const naFonte = daFonte(dados, recorte.fonte)
  const naClassificacao = daClassificacao(naFonte, recorte.classificacao)
  const classificacoes = unicosPorCodigo(
    naFonte.flatMap((d) => (d.categoria ? [{ codigo: d.categoria.classificacaoCodigo, nome: d.categoria.classificacaoNome }] : [])),
  )
  return {
    fontes: fontesDe(dados),
    temTotal: naFonte.some((d) => !d.categoria),
    classificacoes,
    categorias:
      recorte.classificacao && recorte.classificacao !== SEM_RECORTE
        ? unicosPorCodigo(naClassificacao.flatMap((d) => (d.categoria ? [d.categoria] : [])))
        : [],
  }
}

/**
 * Retira, em ordem, os recortes que não têm dado na seleção atual (ex.: ao trocar a fonte ou os filtros gerais).
 * Devolve os nomes retirados para que a interface avise a mudança.
 */
export function normalizarRecorte(dados: DadoPublico[], recorte: RecorteLocal): { recorte: RecorteLocal; removidos: string[] } {
  const removidos: string[] = []
  const limpo: RecorteLocal = { ...recorte }

  if (limpo.fonte && !dados.some((d) => d.fonte.codigo === limpo.fonte)) {
    removidos.push('fonte')
    limpo.fonte = undefined
  }
  const naFonte = daFonte(dados, limpo.fonte)
  if (limpo.classificacao && !daClassificacao(naFonte, limpo.classificacao).length) {
    removidos.push(limpo.classificacao === SEM_RECORTE ? 'sem recorte' : 'classificação')
    limpo.classificacao = undefined
  }
  if (limpo.categoria) {
    const naClassificacao = daClassificacao(naFonte, limpo.classificacao)
    const valida = limpo.classificacao && limpo.classificacao !== SEM_RECORTE && naClassificacao.some((d) => d.categoria?.codigo === limpo.categoria)
    if (!valida) {
      removidos.push('categoria')
      limpo.categoria = undefined
    }
  }
  return { recorte: limpo, removidos }
}

// ---------------------------------------------------------------------------------------------
// Visões: agrupam os dados sem somar fontes, classificações, totais e recortes.

export type Bloco =
  | {
      tipo: 'serie'
      chave: string
      fonte: Fonte
      /** Rótulo do único recorte da série (total ou uma categoria). */
      recorte: string
      periodicidade: 'anual' | 'mensal'
      /** Em ordem cronológica. */
      dados: DadoPublico[]
    }
  | {
      tipo: 'categorias'
      chave: string
      fonte: Fonte
      classificacao: ItemCatalogo
      referencia: ReferenciaDado
      dados: DadoPublico[]
    }
  | {
      tipo: 'valores'
      chave: string
      fonte: Fonte
      dados: DadoPublico[]
    }

function agrupar<T>(itens: T[], chave: (item: T) => string) {
  const grupos = new Map<string, T[]>()
  for (const item of itens) {
    const k = chave(item)
    grupos.set(k, [...(grupos.get(k) ?? []), item])
  }
  return grupos
}

/**
 * - Cada fonte tem suas próprias visões: fontes ou edições distintas não viram uma série contínua.
 * - Um único recorte (total ou uma categoria) com duas ou mais referências anuais (ou mensais) vira série.
 *   Acumulado, levantamento e retrato nunca entram como ponto de série.
 * - Duas ou mais categorias da mesma classificação, referência e fonte viram comparativo por categoria.
 *   Classificações diferentes ficam em visões separadas e nada é somado.
 * - O restante aparece como valores avulsos, cada um com referência e recorte.
 */
export function montarBlocos(dados: DadoPublico[]): Bloco[] {
  const blocos: Bloco[] = []
  for (const [codigoFonte, daFonte] of agrupar(dados, (d) => d.fonte.codigo)) {
    const fonte = daFonte[0].fonte
    const avulsos: DadoPublico[] = []

    for (const [classe, daClasse] of agrupar(daFonte, (d) => d.categoria?.classificacaoCodigo ?? SEM_RECORTE)) {
      const categorias = new Set(daClasse.map((d) => d.categoria?.codigo ?? SEM_RECORTE))

      if (categorias.size === 1) {
        for (const periodicidade of ['anual', 'mensal'] as const) {
          const serie = daClasse.filter((d) => d.referencia.tipo === periodicidade)
          if (serie.length >= 2) {
            blocos.push({
              tipo: 'serie',
              chave: `serie|${codigoFonte}|${classe}|${periodicidade}`,
              fonte,
              recorte: rotuloRecorte(serie[0]),
              periodicidade,
              dados: [...serie].sort((a, b) => ordemReferencia(a.referencia) - ordemReferencia(b.referencia)),
            })
          } else avulsos.push(...serie)
        }
        avulsos.push(...daClasse.filter((d) => d.referencia.tipo !== 'anual' && d.referencia.tipo !== 'mensal'))
        continue
      }

      for (const [chaveReferencia, daReferencia] of agrupar(daClasse, (d) => d.referencia.chave)) {
        if (daReferencia.length >= 2 && daReferencia[0].categoria) {
          const categoria = daReferencia[0].categoria
          blocos.push({
            tipo: 'categorias',
            chave: `categorias|${codigoFonte}|${classe}|${chaveReferencia}`,
            fonte,
            classificacao: { codigo: categoria.classificacaoCodigo, nome: categoria.classificacaoNome },
            referencia: daReferencia[0].referencia,
            dados: daReferencia,
          })
        } else avulsos.push(...daReferencia)
      }
    }

    if (avulsos.length) {
      // Mantém a ordem da API: período mais recente, classificação e categoria (total primeiro).
      const ordem = new Map(daFonte.map((d, i) => [d.id, i]))
      avulsos.sort((a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0))
      blocos.push({ tipo: 'valores', chave: `valores|${codigoFonte}`, fonte, dados: avulsos })
    }
  }
  return blocos
}

/** "3 dados · 2 referências · 1 fonte" para a lista e o cabeçalho do detalhe. */
export function resumoDoIndicador(indicador: IndicadorConsulta) {
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
  const referencias = referenciasDe(indicador.dados).length
  const fontes = fontesDe(indicador.dados).length
  return [
    plural(indicador.dados.length, 'dado', 'dados'),
    plural(referencias, 'referência', 'referências'),
    plural(fontes, 'fonte', 'fontes'),
  ].join(' · ')
}
