import * as React from 'react'
import { Label as LabelPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  'select-none text-ink-muted peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
  {
    variants: {
      variant: {
        /** Área pública: "PERÍODO", "SETOR" (11px, caixa alta). */
        eyebrow: 'eyebrow',
        /** Área administrativa: "Competência", "Status" (12px). */
        field: 'text-xs font-medium',
      },
    },
    defaultVariants: { variant: 'eyebrow' },
  },
)

function Label({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>) {
  return <LabelPrimitive.Root data-slot="label" className={cn(labelVariants({ variant }), className)} {...props} />
}

export { Label, labelVariants }
