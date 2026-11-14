import { http } from '@/api/http/client'
import type {
  CatalogosAdminResponseDto,
  CategoriaCatalogoResponseDto,
  ClassificacaoCatalogoResponseDto,
  ClassificacaoCreateRequestDto,
  DefinicaoResponseDto,
  FonteCatalogoResponseDto,
  FonteCreateRequestDto,
} from '@/api/dtos'
import {
  toCatalogosAdmin,
  toCategoriaCreateDto,
  toDefinicao,
  toDefinicaoCreateDto,
  toDefinicaoUpdateDto,
  toDefinicoesQueryDto,
} from '@/api/mappers/definicao.mapper'
import type {
  CatalogosAdmin,
  CategoriaCatalogo,
  CategoriaEntrada,
  ClassificacaoEntrada,
  DefinicaoCorrecao,
  DefinicaoEntrada,
  DefinicaoIndicador,
  DefinicoesFiltro,
  Fonte,
  FonteEntrada,
  ItemCatalogo,
} from '@/models'

const URL = '/admin/definicoes-indicadores'
const item = (codigo: string) => `${URL}/${encodeURIComponent(codigo)}`

/** Definições de indicadores (exige sessão administrativa). Não há exclusão nem publicação da definição. */
export const adminDefinicaoService = {
  /** Ordenada por nome; padrão: somente ativas. */
  async listar(filtro: DefinicoesFiltro = {}): Promise<DefinicaoIndicador[]> {
    const { data } = await http.get<DefinicaoResponseDto[]>(URL, { params: toDefinicoesQueryDto(filtro) })
    return data.map(toDefinicao)
  },

  async obter(codigo: string): Promise<DefinicaoIndicador> {
    const { data } = await http.get<DefinicaoResponseDto>(item(codigo))
    return toDefinicao(data)
  },

  /** 409 para nome repetido; o código é gerado pela API. */
  async criar(entrada: DefinicaoEntrada): Promise<DefinicaoIndicador> {
    const { data } = await http.post<DefinicaoResponseDto>(URL, toDefinicaoCreateDto(entrada))
    return toDefinicao(data)
  },

  /** 409 quando arquivada ou quando a alteração invalidaria dados existentes (a mensagem lista os vínculos). */
  async corrigir(codigo: string, correcao: DefinicaoCorrecao): Promise<DefinicaoIndicador> {
    const { data } = await http.patch<DefinicaoResponseDto>(item(codigo), toDefinicaoUpdateDto(correcao))
    return toDefinicao(data)
  },

  /** Oculta a definição e todos os seus dados da consulta, sem mudar o estado de cada dado. */
  async arquivar(codigo: string): Promise<DefinicaoIndicador> {
    const { data } = await http.post<DefinicaoResponseDto>(`${item(codigo)}/arquivar`)
    return toDefinicao(data)
  },

  async restaurar(codigo: string): Promise<DefinicaoIndicador> {
    const { data } = await http.post<DefinicaoResponseDto>(`${item(codigo)}/restaurar`)
    return toDefinicao(data)
  },
}

const CATALOGOS = '/admin/catalogos'

/** Setores e unidades são somente leitura; fontes, classificações e categorias são acrescentadas por cadastro. */
export const adminCatalogoService = {
  async listar(): Promise<CatalogosAdmin> {
    const { data } = await http.get<CatalogosAdminResponseDto>(CATALOGOS)
    return toCatalogosAdmin(data)
  },

  /** 409 para nome repetido. */
  async criarFonte(entrada: FonteEntrada): Promise<Fonte> {
    const body: FonteCreateRequestDto = { nome: entrada.nome, links: entrada.links }
    const { data } = await http.post<FonteCatalogoResponseDto>(`${CATALOGOS}/fontes`, body)
    return { codigo: data.codigo, nome: data.nome, links: data.links }
  },

  async criarClassificacao(entrada: ClassificacaoEntrada): Promise<ItemCatalogo> {
    const body: ClassificacaoCreateRequestDto = { nome: entrada.nome }
    const { data } = await http.post<ClassificacaoCatalogoResponseDto>(`${CATALOGOS}/classificacoes`, body)
    return { codigo: data.codigo, nome: data.nome }
  },

  /** 409 para nome repetido na mesma classificação. */
  async criarCategoria(entrada: CategoriaEntrada): Promise<CategoriaCatalogo> {
    const { data } = await http.post<CategoriaCatalogoResponseDto>(`${CATALOGOS}/categorias`, toCategoriaCreateDto(entrada))
    return { codigo: data.codigo, nome: data.nome, classificacaoCodigo: data.classificacao_codigo, codigoCnae: data.codigo_cnae }
  },
}
