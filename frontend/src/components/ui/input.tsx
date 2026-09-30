import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-md border border-line bg-surface px-3 text-sm text-ink shadow-sm transition-[border-color,box-shadow] placeholder:text-ink-subtle',
        'focus-visible:border-brand-purple focus-visible:shadow-focus',
        'aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
