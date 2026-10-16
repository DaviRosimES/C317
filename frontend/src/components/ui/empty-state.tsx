import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

function EmptyState({ title = 'Sem dados para o período', description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn('flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line px-6 py-10 text-center', className)}
      {...props}
    >
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-md text-[13px] text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export { EmptyState }
