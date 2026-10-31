import * as React from 'react'
import { cn } from '@/lib/utils'

export interface DataTableColumn {
  key: string
  header: string
  align?: 'left' | 'right'
}

interface DataTableProps extends React.ComponentProps<'div'> {
  caption: string
  columns: DataTableColumn[]
  rows: { key: string; cells: Record<string, React.ReactNode> }[]
}

function DataTable({ caption, columns, rows, className, ...props }: DataTableProps) {
  return (
    <div data-slot="data-table" className={cn('overflow-x-auto', className)} {...props}>
      <table className="w-full min-w-[480px] text-left text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs text-ink-muted">
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th key={column.key} scope="col" className={cn('py-2 pr-4 font-medium last:pr-0', column.align === 'right' && 'text-right')}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-line align-top last:border-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('py-2.5 pr-4 text-ink last:pr-0', column.align === 'right' && 'text-right tabular-nums')}
                >
                  {row.cells[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { DataTable }
