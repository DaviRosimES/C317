import type { Observacao, Referencia, Territorio } from '@/models'

export const referenciaKey = (r: Referencia) =>
  `${r.tipo}:${r.anoInicio}-${r.anoFim}${r.mes ? `-${String(r.mes).padStart(2, '0')}` : ''}`

const ORDEM_TIPO: Record<string, number> = { mensal: 0, anual: 1, acumulada: 2, levantamento: 3, retrato: 4 }

export function compararReferencias(a: Referencia, b: Referencia) {
  return (
    (ORDEM_TIPO[a.tipo] ?? 9) - (ORDEM_TIPO[b.tipo] ?? 9) ||
    a.anoFim - b.anoFim ||
    a.anoInicio - b.anoInicio ||
    (a.mes ?? 0) - (b.mes ?? 0)
  )
}

export const valorNumerico = (o: Observacao) => Number(o.valor)

export function atendeReferencia(o: Observacao, filtro: string | undefined) {
  if (!filtro) return true
  if (filtro.startsWith('tipo:')) return o.referencia.tipo === filtro.slice('tipo:'.length)
  return referenciaKey(o.referencia) === filtro
}

export interface FiltroRecorte {
  categoria?: string
  cnae?: string
}

export function aplicarRecorte(observacoes: Observacao[], filtro: FiltroRecorte, classificacaoFiltrada: string | null) {
  return observacoes.filter((o) => {
    if (filtro.categoria && classificacaoFiltrada && o.categoria?.classificacao === classificacaoFiltrada) {
      return o.categoria.codigo === filtro.categoria
    }
    if (filtro.cnae && o.codigoCnae) return o.codigoCnae === filtro.cnae
    return true
  })
}

export const filtroAlcanca = (o: Observacao, filtro: FiltroRecorte, classificacaoFiltrada: string | null) =>
  (!!filtro.categoria && o.categoria?.classificacao === classificacaoFiltrada) || (!!filtro.cnae && !!o.codigoCnae)

export function territorioPrincipal(observacoes: Observacao[]): Territorio | null {
  const contagem = new Map<string, { territorio: Territorio; total: number }>()
  for (const o of observacoes) {
    const atual = contagem.get(o.territorio.codigo) ?? { territorio: o.territorio, total: 0 }
    atual.total += 1
    contagem.set(o.territorio.codigo, atual)
  }
  return [...contagem.values()].sort((a, b) => b.total - a.total)[0]?.territorio ?? null
}

export interface Serie {
  territorio: Territorio
  categoria: Observacao['categoria']
  unidade: Observacao['unidade']
  pontos: Observacao[]
}

export interface Comparativo {
  referencias: Observacao['referencia'][]
  territorios: Territorio[]
  observacoes: Observacao[]
}

export interface GrupoRecorte {
  chave: string
  titulo: string
  referencia: Observacao['referencia']
  territorio: Territorio
  unidade: Observacao['unidade']
  observacoes: Observacao[]
}

export interface SecaoIndicador {
  codigo: string
  nome: string
  series: Serie[]
  comparativo: Comparativo | null
  recortes: GrupoRecorte[]
  avulsas: Observacao[]
  observacoes: Observacao[]
}

const MINIMO_SERIE = 3

function agrupar<T>(itens: T[], chave: (item: T) => string) {
  const grupos = new Map<string, T[]>()
  for (const item of itens) {
    const k = chave(item)
    const lista = grupos.get(k)
    if (lista) lista.push(item)
    else grupos.set(k, [item])
  }
  return grupos
}

const prefixoCategoria = (nome: string) => (nome.includes(' – ') ? nome.split(' – ')[0] : '')

function montarSecao(codigo: string, nome: string, observacoes: Observacao[], cidadesDoTema: Territorio[]): SecaoIndicador {
  const cobertas = new Set<string>()

  const series: Serie[] = []
  const candidatas = agrupar(
    observacoes.filter((o) => o.referencia.tipo === 'anual' || o.referencia.tipo === 'mensal'),
    (o) => [o.referencia.tipo, o.territorio.codigo, o.categoria?.codigo ?? '', o.unidade.codigo, o.fonte.codigo].join('|'),
  )
  for (const pontos of candidatas.values()) {
    if (pontos.length < MINIMO_SERIE) continue
    const ordenados = [...pontos].sort((a, b) => compararReferencias(a.referencia, b.referencia))
    series.push({ territorio: ordenados[0].territorio, categoria: ordenados[0].categoria, unidade: ordenados[0].unidade, pontos: ordenados })
    for (const p of ordenados) cobertas.add(p.id)
  }

  const territorios = [...new Map(observacoes.map((o) => [o.territorio.codigo, o.territorio])).values()]
  let comparativo: Comparativo | null = null
  if (territorios.length > 1) {
    for (const cidade of cidadesDoTema) if (!territorios.some((t) => t.codigo === cidade.codigo)) territorios.push(cidade)
    const porReferencia = agrupar(observacoes, (o) => referenciaKey(o.referencia))
    const comparaveis = [...porReferencia.values()].filter((lista) => new Set(lista.map((o) => o.territorio.codigo)).size > 1)
    if (comparaveis.length) {
      const usadas = comparaveis.flat()
      for (const o of usadas) cobertas.add(o.id)
      comparativo = {
        referencias: comparaveis.map((lista) => lista[0].referencia).sort(compararReferencias),
        territorios: territorios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
        observacoes: usadas,
      }
    }
  }

  const restantes = observacoes.filter((o) => !cobertas.has(o.id))
  const recortes: GrupoRecorte[] = []
  const comCategoria = agrupar(
    restantes.filter((o) => o.categoria),
    (o) =>
      [
        referenciaKey(o.referencia),
        o.territorio.codigo,
        o.unidade.codigo,
        o.categoria!.classificacao,
        prefixoCategoria(o.categoria!.nome),
      ].join('|'),
  )
  for (const [chave, grupo] of comCategoria) {
    if (grupo.length < 2) continue
    const prefixo = prefixoCategoria(grupo[0].categoria!.nome)
    recortes.push({
      chave,
      titulo: prefixo || nome,
      referencia: grupo[0].referencia,
      territorio: grupo[0].territorio,
      unidade: grupo[0].unidade,
      observacoes: grupo,
    })
    for (const o of grupo) cobertas.add(o.id)
  }

  return {
    codigo,
    nome,
    series,
    comparativo,
    recortes: recortes.sort((a, b) => compararReferencias(a.referencia, b.referencia)),
    avulsas: observacoes
      .filter((o) => !cobertas.has(o.id))
      .sort((a, b) => compararReferencias(a.referencia, b.referencia) || a.territorio.nome.localeCompare(b.territorio.nome, 'pt-BR')),
    observacoes,
  }
}

export function montarSecoes(observacoes: Observacao[], cidadesDoTema: Territorio[] = []): SecaoIndicador[] {
  return [...agrupar(observacoes, (o) => o.indicador.codigo).values()]
    .map((lista) => montarSecao(lista[0].indicador.codigo, lista[0].indicador.nome, lista, cidadesDoTema))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export function linhasDoComparativo(observacoes: Observacao[]) {
  const porTerritorio = agrupar(observacoes, (o) => o.territorio.codigo)
  const unidades = new Set(observacoes.map((o) => o.unidade.codigo))
  if (unidades.size === 1 && [...porTerritorio.values()].every((lista) => lista.length === 1)) {
    return [{ chave: 'unica', rotulo: observacoes[0].unidade.nome, observacoes }]
  }
  return [...agrupar(observacoes, (o) => `${o.categoria?.codigo ?? 'total'}|${o.unidade.codigo}`).entries()].map(
    ([chave, lista]) => ({
      chave,
      rotulo: `${lista[0].categoria?.nome ?? 'Total'} (${lista[0].unidade.nome})`,
      observacoes: lista,
    }),
  )
}

export const notasDe = (observacoes: Observacao[]) => [...new Set(observacoes.flatMap((o) => o.notas))]

export const fontesDistintas = (observacoes: Observacao[]) => [
  ...new Map(observacoes.map((o) => [o.fonte.codigo, o.fonte])).values(),
]
