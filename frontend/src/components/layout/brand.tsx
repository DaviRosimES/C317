import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function Brand({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex flex-col leading-none text-ink focus-visible:shadow-focus', className)}>
      <span className="text-[17px] font-bold tracking-tight">observatório</span>
      <span className="text-[17px] font-bold tracking-tight">do turismo</span>
      <span className="mt-1 text-[7px] font-semibold uppercase tracking-wide text-ink-muted">Santa Rita do Sapucaí</span>
    </Link>
  )
}
