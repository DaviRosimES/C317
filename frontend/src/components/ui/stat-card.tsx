import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Card } from './card'

const dotVariants = cva('size-3 rounded-full', {
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

const trendVariants = cva('text-xs font-semibold', {
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
  meta?: React.ReactNode
}

/** Card de indicador (KPI) — "Empresas do setor", "Leitos disponíveis". */
function StatCard({ label, value, helper, meta, color, tone, className, ...props }: StatCardProps) {
  return (
    <Card data-slot="stat-card" className={cn('flex flex-col p-5 shadow-card', className)} {...props}>
      <span aria-hidden className={dotVariants({ color })} />
      <p className="mt-[18px] text-[13px] font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-ink tabular-nums">{value}</p>
      {helper ? <p className={cn('mt-2', trendVariants({ tone }))}>{helper}</p> : null}
      {meta ? <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-xs text-ink-muted">{meta}</div> : null}
    </Card>
  )
}

export { StatCard }
