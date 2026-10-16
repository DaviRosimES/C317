import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from './badge'

function DemoBadge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <Badge variant="warning" className={cn('h-[22px] px-2 text-[10px]', className)} title="Valor fictício de demonstração" {...props}>
      Dado fictício
    </Badge>
  )
}

interface SourceNoteProps extends React.ComponentProps<'p'> {
  fontes: string[]
  demonstracao?: boolean
}

function SourceNote({ fontes, demonstracao, className, ...props }: SourceNoteProps) {
  const unicas = [...new Set(fontes.filter(Boolean))]
  if (!unicas.length && !demonstracao) return null
  return (
    <p className={cn('flex flex-wrap items-center gap-2 text-xs text-ink-muted', className)} {...props}>
      {unicas.length ? <span>Fonte: {unicas.join(' · ')}</span> : null}
      {demonstracao ? <DemoBadge /> : null}
    </p>
  )
}

export { DemoBadge, SourceNote }
