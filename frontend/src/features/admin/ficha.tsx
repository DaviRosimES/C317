import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Termo e valor de uma ficha (`<dl>`) da administração. */
export function Item({ termo, className, children }: { termo: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs font-medium text-ink-muted">{termo}</dt>
      <dd className="mt-1 break-words text-ink">{children}</dd>
    </div>
  )
}
