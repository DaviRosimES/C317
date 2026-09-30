import * as React from 'react'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

type FilterChipsProps = Omit<ToggleGroupPrimitive.ToggleGroupSingleProps, 'type'> & {
  /** Permite desmarcar o filtro ativo (padrão: false — sempre há um selecionado). */
  allowEmpty?: boolean
}

/**
 * Grupo de filtros de seleção única ("Hospedagem" · "Empregos" · "Empresas").
 * Baseado no ToggleGroup do Radix: navegação por setas e estado acessível inclusos.
 */
function FilterChips({ className, allowEmpty = false, onValueChange, ...props }: FilterChipsProps) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      data-slot="filter-chips"
      className={cn('flex flex-wrap items-center gap-2', className)}
      onValueChange={(value) => {
        if (!value && !allowEmpty) return
        onValueChange?.(value)
      }}
      {...props}
    />
  )
}

function FilterChip({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="filter-chip"
      className={cn(
        'inline-flex h-8 items-center rounded-md border border-line bg-surface px-3 text-xs font-medium text-ink-muted transition-colors',
        'hover:bg-canvas hover:text-ink focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50',
        'data-[state=on]:border-brand-purple/20 data-[state=on]:bg-surface-muted data-[state=on]:text-brand-purple',
        className,
      )}
      {...props}
    />
  )
}

export { FilterChips, FilterChip }
