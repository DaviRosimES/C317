import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,box-shadow,color,opacity] focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** "Explorar indicadores" */
        primary: 'bg-brand-purple text-white shadow-sm hover:bg-brand-purple/90',
        /** "Baixar relatório" */
        secondary: 'border border-line bg-surface text-ink shadow-sm hover:bg-canvas',
        /** Uso pontual: gradiente reservado para destaque. */
        gradient: 'bg-brand-gradient text-white shadow-sm hover:opacity-90',
        ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
        link: 'text-brand-purple underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  /** Renderiza o filho (ex.: <Link>) com os estilos do botão. */
  asChild?: boolean
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button, buttonVariants }
