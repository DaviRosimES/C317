import type { Categoria, ItemCatalogo, ObservacaoAdmin, Territorio, Unidade } from '@/models'

/**
 * Rótulos de exibição para códigos do catálogo. Não limitam o conjunto: um tipo ou classificação
 * novo aparece com o próprio código legível até ganhar um rótulo aqui.
 */
const ROTULOS_CLASSIFICACAO: Record<string, string> = {
  setor_sebrae: 'Setor Sebrae',
  segmento_sebrae: 'Segmento Sebrae',
  porte_empresa: 'Porte da empresa',
  categoria_hospedagem: 'Categoria de hospedagem',
  categoria_cadastro_smcelt: 'Categoria do cadastro SMCELT',
  mes_citado_em_questionario: 'Mês citado em questionário',
}

const ROTULOS_TIPO_TERRITORIO: Record<string, string> = {
  municipio: 'Municípios',
  regional: 'Regiões',
  base_cadastral: 'Bases cadastrais',
}

const legivel = (codigo: string) => {
  const texto = codigo.replace(/_/g, ' ').trim()
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Classificações "recorte_<indicador>" agrupam os recortes informados para aquele indicador. */
export const indicadorDaClassificacao = (classificacao: string) =>
  classificacao.startsWith('recorte_') ? classificacao.slice('recorte_'.length) : null

export function rotuloClassificacao(classificacao: string, indicadores: ItemCatalogo[]) {
  const codigoIndicador = indicadorDaClassificacao(classificacao)
  if (codigoIndicador) {
    const indicador = indicadores.find((i) => i.codigo === codigoIndicador)
    return indicador ? `Recortes de “${indicador.nome}”` : legivel(classificacao)
  }
  return ROTULOS_CLASSIFICACAO[classificacao] ?? legivel(classificacao)
}

export const rotuloTipoTerritorio = (tipo: string) => ROTULOS_TIPO_TERRITORIO[tipo] ?? legivel(tipo)

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
