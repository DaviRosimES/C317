/** Paleta da marca — mesma ordem e nomes do Figma. Útil para gráficos e legendas. */
export const brandColors = {
  blue: { name: 'Azul', hex: '#0A4AAD' },
  purple: { name: 'Roxo', hex: '#6C5CE0' },
  magenta: { name: 'Magenta', hex: '#C750D6' },
  cyan: { name: 'Ciano', hex: '#5FE6E0' },
  sky: { name: 'Azul-céu', hex: '#27B7FD' },
  lilac: { name: 'Lilás', hex: '#B986ED' },
  yellow: { name: 'Amarelo', hex: '#FADA77' },
} as const

export type BrandColor = keyof typeof brandColors

/** Sequência recomendada para séries de gráficos ("gráficos com paleta de apoio"). */
export const chartPalette = [
  brandColors.purple.hex,
  brandColors.sky.hex,
  brandColors.magenta.hex,
  brandColors.cyan.hex,
  brandColors.blue.hex,
  brandColors.lilac.hex,
  brandColors.yellow.hex,
]
