import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { brandColors } from '@/lib/brand'

export interface ColumnDatum {
  label: string
  valor: number
  rotulo: string
  detalhe?: string
}

interface ColumnChartProps {
  data: ColumnDatum[]
  height?: number
  destacarUltima?: boolean
  ariaLabel: string
  larguraMinimaColuna?: number
}

export function ColumnChart({ data, height = 240, destacarUltima = true, ariaLabel, larguraMinimaColuna = 0 }: ColumnChartProps) {
  return (
    <div role="img" aria-label={ariaLabel} className="w-full overflow-x-auto">
      <div style={{ minWidth: data.length * larguraMinimaColuna }}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 28, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid vertical={false} stroke="#e7eaf0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#667085', fontSize: 12 }} />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip
              cursor={{ fill: '#eef0ff' }}
              content={({ active, payload }) => {
                const datum = payload?.[0]?.payload as ColumnDatum | undefined
                if (!active || !datum) return null
                return (
                  <div className="rounded-md border border-line bg-surface px-3 py-2 text-xs shadow-card">
                    <p className="font-semibold text-ink">{datum.rotulo}</p>
                    {datum.detalhe ? <p className="mt-0.5 text-ink-muted">{datum.detalhe}</p> : null}
                  </div>
                )
              }}
            />
            <Bar dataKey="valor" radius={[8, 8, 0, 0]} maxBarSize={48} minPointSize={2} isAnimationActive={false}>
              {data.map((datum, index) => (
                <Cell
                  key={datum.label}
                  fill={destacarUltima && index === data.length - 1 ? brandColors.blue.hex : brandColors.lilac.hex}
                />
              ))}
              <LabelList dataKey="rotulo" position="top" fill="#475467" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
