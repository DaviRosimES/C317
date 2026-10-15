import * as React from 'react'
import { cn } from '@/lib/utils'

interface ListRowProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  aside?: React.ReactNode
  actions?: React.ReactNode
}

function ListRow({ leading, title, subtitle, meta, aside, actions, className, ...props }: ListRowProps) {
  return (
    <div
      data-slot="list-row"
      className={cn('flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center sm:p-5', className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {leading}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-ink">{title}</p>
          {subtitle ? <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p> : null}
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">{meta}</div> : null}
        </div>
      </div>
      {aside ? <div className="flex shrink-0 items-center gap-3 sm:justify-end">{aside}</div> : null}
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

function ListRowThumb({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('flex size-12 shrink-0 items-center justify-center rounded-lg bg-info-soft text-xs font-bold text-brand-purple', className)}
      {...props}
    />
  )
}

export { ListRow, ListRowThumb }
