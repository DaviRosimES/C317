import type { TipoReferencia } from '@/models/observacao'

/** Tipos do contrato c317.m6.v1; não existe tipo para período desconhecido. */
export const TIPOS_REFERENCIA: { tipo: TipoReferencia; rotulo: string; descricao: string }[] = [
  { tipo: 'anual', rotulo: 'Anual', descricao: 'Valor de um ano (ex.: 2024).' },
  {
    tipo: 'mensal',
    rotulo: 'Mensal',
    descricao: 'Somente quando o valor é realmente de um mês. Um mês citado em questionário é categoria, não referência.',
  },
  {
    tipo: 'acumulada',
    rotulo: 'Acumulada',
    descricao: 'Total de um intervalo (ex.: 2000–2024). Não é o valor do último ano nem se soma às séries anuais.',
  },
  {
    tipo: 'levantamento',
    rotulo: 'Levantamento',
    descricao: 'Pesquisa ou cadastro realizado em um ou mais anos (ex.: respostas de 2022 e 2023).',
  },
  {
    tipo: 'retrato',
    rotulo: 'Retrato',
    descricao: 'Extração datada de uma base (ex.: Lattes em 04/10/2026); não é série anual.',
  },
]

export const rotuloTipoReferencia = (tipo: TipoReferencia) =>
  TIPOS_REFERENCIA.find((item) => item.tipo === tipo)?.rotulo ?? tipo
