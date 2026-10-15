import { chartPalette } from '@/lib/brand'
import { cn } from '@/lib/utils'

export interface HorizontalBarDatum {
  key: string
  label: string
  valor: number
  rotulo: string
  destaque?: boolean
  title?: string
}

export function HorizontalBars({ data, className }: { data: HorizontalBarDatum[]; className?: string }) {
  const max = Math.max(...data.map((d) => d.valor), 0)
  return (
    <ul className={cn('flex flex-col gap-4', className)}>
      {data.map((datum, index) => (
        <li key={datum.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-[13px]" title={datum.title}>
          <span className={cn('truncate text-ink-muted', datum.destaque && 'font-semibold text-ink')}>{datum.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-canvas">
            <span
              className="block h-full rounded-full"
              style={{
                width: max > 0 ? `${(datum.valor / max) * 100}%` : '0%',
                backgroundColor: chartPalette[index % chartPalette.length],
              }}
            />
          </span>
          <span className="min-w-10 text-right font-semibold tabular-nums text-ink">{datum.rotulo}</span>
        </li>
      ))}
    </ul>
  )
}
