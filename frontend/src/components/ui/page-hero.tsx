import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeroProps extends Omit<React.ComponentProps<'header'>, 'title'> {
  /** Ex.: "Observatório do Turismo" */
  eyebrow?: string
  /** Ex.: "Santa Rita do Sapucaí · HEIComp 2026.2" */
  title: React.ReactNode
  description?: React.ReactNode
}

/** Faixa de topo com o gradiente institucional. */
function PageHero({ eyebrow, title, description, className, children, ...props }: PageHeroProps) {
  return (
    <header data-slot="page-hero" className={cn('bg-brand-gradient text-white', className)} {...props}>
      <div className="mx-auto flex min-h-40 max-w-7xl flex-col justify-center gap-2 px-6 py-12 md:px-10">
        {eyebrow ? <p className="eyebrow text-white/90">{eyebrow}</p> : null}
        <h1 className="text-xl font-medium md:text-2xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-white/80">{description}</p> : null}
        {children}
      </div>
    </header>
  )
}

export { PageHero }
