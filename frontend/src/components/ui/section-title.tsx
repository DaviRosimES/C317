import * as React from 'react'
import { cn } from '@/lib/utils'

/** Título de seção ("Cores", "Componentes-base"). */
function SectionTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('text-xl font-bold tracking-tight text-ink', className)} {...props} />
}

export { SectionTitle }
