import * as React from 'react'
import { ColumnChart } from '@/components/charts/column-chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { formatDecimal } from '@/lib/format'
import { fontesDistintas, notasDe, valorNumerico, type Serie } from '@/lib/observacoes'
import { mesCurto } from '@/lib/periodo'
import type { Observacao, Territorio } from '@/models'
import { FonteObservacao, NotasObservacao, valorTexto } from './metadados'

const chaveSerie = (s: Serie) => `${s.territorio.codigo}|${s.categoria?.codigo ?? ''}|${s.unidade.codigo}|${s.pontos[0].referencia.tipo}`

const rotuloPonto = (o: Observacao) =>
  o.referencia.tipo === 'mensal' && o.referencia.mes ? `${mesCurto(o.referencia.mes)}/${o.referencia.anoFim}` : String(o.referencia.anoFim)

interface SerieBlocoProps {
  indicador: string
  series: Serie[]
  acumulados: Observacao[]
  territorioInicial: Territorio | null
}

export function SerieBloco({ indicador, series, acumulados, territorioInicial }: SerieBlocoProps) {
  const inicial = series.find((s) => s.territorio.codigo === territorioInicial?.codigo) ?? series[0]
  const [chave, setChave] = React.useState(chaveSerie(inicial))
  const serie = series.find((s) => chaveSerie(s) === chave) ?? inicial
  const variasUnidades = new Set(series.map((s) => s.unidade.codigo)).size > 1
  const rotuloSerie = (s: Serie) =>
    [s.territorio.nome, s.categoria?.nome, variasUnidades ? s.unidade.nome : null].filter(Boolean).join(' — ')

  const periodicidade = serie.pontos[0].referencia.tipo === 'mensal' ? 'mensal' : 'anual'
  const primeiro = serie.pontos[0].referencia
  const ultimo = serie.pontos.at(-1)!.referencia
  const acumuladosDaSerie = acumulados.filter(
    (o) =>
      o.territorio.codigo === serie.territorio.codigo &&
      o.unidade.codigo === serie.unidade.codigo &&
      (o.categoria?.codigo ?? null) === (serie.categoria?.codigo ?? null),
  )

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Série {periodicidade} — {rotuloSerie(serie)}</CardTitle>
          <CardDescription>
            Um valor por {periodicidade === 'anual' ? 'ano' : 'mês'}, de {rotuloPonto(serie.pontos[0])} a {rotuloPonto(serie.pontos.at(-1)!)}
            {' '}({serie.unidade.nome}). Os valores não são somados entre si.
          </CardDescription>
        </div>
        {series.length > 1 ? (
          <FormField label="Série" labelVariant="field" htmlFor={`serie-${indicador}`} className="sm:w-64">
            <Select value={chaveSerie(serie)} onValueChange={setChave}>
              <SelectTrigger id={`serie-${indicador}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {series.map((s) => (
                  <SelectItem key={chaveSerie(s)} value={chaveSerie(s)}>
                    {rotuloSerie(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ColumnChart
          ariaLabel={`${indicador}: série ${periodicidade} de ${rotuloSerie(serie)} entre ${primeiro.anoInicio} e ${ultimo.anoFim}`}
          larguraMinimaColuna={34}
          destacarUltima={false}
          data={serie.pontos.map((o) => ({
            label: rotuloPonto(o),
            valor: valorNumerico(o),
            rotulo: formatDecimal(o.valorExibicao),
            detalhe: `${valorTexto(o)} · ${o.referencia.rotulo}`,
          }))}
        />
        {acumuladosDaSerie.length ? (
          <ul className="flex flex-wrap gap-3">
            {acumuladosDaSerie.map((o) => (
              <li key={o.id} className="rounded-lg border border-line px-3 py-2 text-xs">
                <span className="font-semibold text-ink">{valorTexto(o)}</span>{' '}
                <span className="text-ink-muted">no total {o.referencia.rotulo}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <details className="text-[13px]">
          <summary className="cursor-pointer font-medium text-brand-purple">Ver dados em tabela</summary>
          <DataTable
            className="mt-3"
            caption={`${indicador}: ${rotuloSerie(serie)}`}
            columns={[
              { key: 'referencia', header: 'Referência' },
              { key: 'valor', header: 'Valor', align: 'right' },
              { key: 'notas', header: 'Notas' },
            ]}
            rows={serie.pontos.map((o) => ({
              key: o.id,
              cells: { referencia: o.referencia.rotulo, valor: valorTexto(o), notas: o.notas.join(' ') || '—' },
            }))}
          />
        </details>
        <FonteObservacao fontes={fontesDistintas(serie.pontos)} />
        <NotasObservacao notas={notasDe([...serie.pontos, ...acumuladosDaSerie])} />
      </CardContent>
    </Card>
  )
}
