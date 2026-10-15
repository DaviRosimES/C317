import * as React from 'react'
import { cn } from '@/lib/utils'

/** Lista compacta com marcadores (card "Princípios de interface"). */
function BulletList({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      className={cn('list-disc space-y-0.5 pl-5 text-sm text-ink-muted marker:text-ink-muted', className)}
      {...props}
    />
  )
}

export { BulletList }
