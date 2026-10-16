import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Mensagem de retorno de uma operação ("Sessão expirada", "Lançamento publicado"). */
const alertVariants = cva(
  'flex items-start gap-3 rounded-md px-4 py-3 text-[13px] [&>svg]:mt-px [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        info: 'bg-info-soft text-brand-purple',
        success: 'bg-success-soft text-ink [&>svg]:text-success',
        warning: 'bg-warning-soft text-ink [&>svg]:text-warning',
        danger: 'bg-danger-soft text-ink [&>svg]:text-danger',
      },
    },
    defaultVariants: { variant: 'info' },
  },
)

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Alert, alertVariants }
