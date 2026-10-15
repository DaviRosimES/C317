import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Badge de status ("Aguardando", "Com observação"…). */
const badgeVariants = cva(
  'inline-flex h-[26px] items-center justify-center whitespace-nowrap rounded-sm px-3 text-[11px] font-semibold',
  {
    variants: {
      variant: {
        info: 'bg-info-soft text-brand-purple',
        warning: 'bg-warning-soft text-warning',
        success: 'bg-success-soft text-success',
        danger: 'bg-danger-soft text-danger',
        neutral: 'bg-canvas text-ink-muted',
      },
    },
    defaultVariants: { variant: 'info' },
  },
)

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
