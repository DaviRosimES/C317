import * as React from 'react'
import { ExternalLink } from 'lucide-react'
import { dominioDoLink } from '@/lib/format'
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

function SourceLinks({ links, className }: { links: string[]; className?: string }) {
  if (!links.length) {
    return <p className={cn('text-xs text-ink-subtle', className)}>Sem link: a fonte é identificada pelo nome do documento.</p>
  }
  return (
    <ul className={cn('flex flex-col gap-1', className)}>
      {links.map((link) => (
        <li key={link} className="min-w-0">
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 text-xs font-medium text-brand-purple underline-offset-4 hover:underline"
          >
            <ExternalLink aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{dominioDoLink(link)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export { DemoBadge, SourceNote, SourceLinks }
