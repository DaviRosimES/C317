import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeroProps extends Omit<React.ComponentProps<'header'>, 'title'> {
  /** Ex.: "Observatório do Turismo" */
  eyebrow?: string
  /** Ex.: "Santa Rita do Sapucaí · HEIComp 2026.2" */
  title: React.ReactNode
  description?: React.ReactNode
}

/** Faixa de topo com o gradiente institucional (Figma › "Brand gradient", 260px). */
function PageHero({ eyebrow, title, description, className, children, ...props }: PageHeroProps) {
  return (
    <header data-slot="page-hero" className={cn('bg-brand-gradient', className)} {...props}>
      <div className="mx-auto flex min-h-[260px] max-w-7xl flex-col justify-center gap-2 px-6 md:px-16">
        {eyebrow ? <p className="text-[13px] font-bold uppercase text-on-brand-muted">{eyebrow}</p> : null}
        <h1 className="text-lg font-medium text-on-brand">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-on-brand/80">{description}</p> : null}
        {children}
      </div>
    </header>
  )
}

export { PageHero }
