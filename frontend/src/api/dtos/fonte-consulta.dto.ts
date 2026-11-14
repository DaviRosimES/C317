/** Contrato 1:1 de `FontePublica` (GET /consulta/fontes): só fontes com dados elegíveis de Santa Rita. */
export interface FontePublicaResponseDto {
  codigo: string
  nome: string
  links: string[]
  /** Quantidade de indicadores com dados elegíveis desta fonte. */
  indicadores: number
}
