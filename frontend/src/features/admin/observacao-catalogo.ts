import { indicadorDaClassificacao } from '@/lib/catalogo-observacoes'
import type { Categoria, ItemCatalogo, ObservacaoAdmin, Territorio, Unidade } from '@/models'

export { indicadorDaClassificacao, rotuloClassificacao, rotuloTipoTerritorio } from '@/lib/catalogo-observacoes'

export function descreverUnidade(unidade: Unidade) {
  const numero = unidade.inteira ? 'Número inteiro' : 'Aceita decimais'
  const limite = unidade.maximo === null ? 'sem máximo' : `de 0 a ${String(unidade.maximo).replace('.', ',')}`
  const casas = unidade.casasExibicao
    ? `exibido com ${unidade.casasExibicao} ${unidade.casasExibicao === 1 ? 'casa' : 'casas'}`
    : 'exibido sem casas decimais'
  return `${numero} · ${limite} · ${casas}`
}

function agruparPor<T>(itens: T[], chave: (item: T) => string) {
  const grupos = new Map<string, T[]>()
  for (const item of itens) grupos.set(chave(item), [...(grupos.get(chave(item)) ?? []), item])
  return grupos
}

/** Classificações oferecidas no formulário: primeiro as do indicador, depois as gerais, depois as demais. */
export function classificacoesPara(categorias: Categoria[], indicador: string) {
  const todas = [...new Set(categorias.map((c) => c.classificacao))]
  const doIndicador = todas.filter((c) => indicadorDaClassificacao(c) === indicador)
  const gerais = todas.filter((c) => !indicadorDaClassificacao(c))
  const outras = todas.filter((c) => indicadorDaClassificacao(c) && indicadorDaClassificacao(c) !== indicador)
  return { doIndicador, gerais, outras }
}

export const territoriosPorTipo = (territorios: Territorio[]) => agruparPor(territorios, (t) => t.tipo)

/** Resumo das observações já cadastradas de um indicador, para sugerir unidade e temas. */
export function perfilDoIndicador(observacoes: ObservacaoAdmin[]) {
  const unidades = new Map(observacoes.map((o) => [o.unidade.codigo, o.unidade]))
  const temas = new Map<string, ItemCatalogo[]>()
  for (const o of observacoes) temas.set(o.temas.map((t) => t.codigo).sort().join('|'), o.temas)
  return {
    total: observacoes.length,
    unidades: [...unidades.values()],
    combinacoesDeTemas: [...temas.values()],
    territorios: [...new Map(observacoes.map((o) => [o.territorio.codigo, o.territorio])).values()],
  }
}
