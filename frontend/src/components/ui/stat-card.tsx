import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Card } from './card'

const dotVariants = cva('size-2 rounded-full', {
  variants: {
    color: {
      blue: 'bg-brand-blue',
      purple: 'bg-brand-purple',
      magenta: 'bg-brand-magenta',
      cyan: 'bg-brand-cyan',
      sky: 'bg-brand-sky',
      lilac: 'bg-brand-lilac',
      yellow: 'bg-brand-yellow',
    },
  },
  defaultVariants: { color: 'sky' },
})

const trendVariants = cva('text-xs font-medium', {
  variants: {
    tone: { positive: 'text-success', negative: 'text-danger', neutral: 'text-ink-muted' },
  },
  defaultVariants: { tone: 'positive' },
})

export interface StatCardProps
  extends Omit<React.ComponentProps<'div'>, 'color'>,
    VariantProps<typeof dotVariants>,
    VariantProps<typeof trendVariants> {
  /** Ex.: "Empresas do setor" */
  label: string
  /** Valor já formatado (use formatNumber de @/lib/format). */
  value: React.ReactNode
  /** Linha de apoio: variação ou data de atualização. */
  helper?: React.ReactNode
}

/** Card de indicador (KPI) — "Empresas do setor", "Leitos disponíveis". */
function StatCard({ label, value, helper, color, tone, className, ...props }: StatCardProps) {
  return (
    <Card data-slot="stat-card" className={cn('flex flex-col gap-2 p-4', className)} {...props}>
      <span aria-hidden className={dotVariants({ color })} />
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
      <p className="text-3xl font-bold leading-none tracking-tight text-ink tabular-nums">{value}</p>
      {helper ? <p className={trendVariants({ tone })}>{helper}</p> : null}
    </Card>
  )
}

export { StatCard }
