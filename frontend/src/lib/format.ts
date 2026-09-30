const numberFormatter = new Intl.NumberFormat('pt-BR')
const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})

/** 1428 → "1.428" */
export const formatNumber = (value: number) => numberFormatter.format(value)

/** 0.082 → "+8,2%" */
export const formatPercent = (value: number) => percentFormatter.format(value)
