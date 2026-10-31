import type { ItemCatalogo } from '@/models'

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

export const tipoTerritorioConhecido = (tipo: string) => tipo in ROTULOS_TIPO_TERRITORIO

const ROTULOS_ABRANGENCIA: Record<string, string> = {
  municipio: 'Município',
  regional: 'Região',
  base_cadastral: 'Base cadastral',
}

export const rotuloAbrangencia = (tipo: string) => ROTULOS_ABRANGENCIA[tipo] ?? legivel(tipo)
