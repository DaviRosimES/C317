import { HorizontalBars } from '@/components/charts/horizontal-bars'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, DataTable, DemoBadge } from '@/components/ui'
import { fontesDistintas, notasDe, valorNumerico, type GrupoRecorte } from '@/lib/observacoes'
import { Abrangencia, FonteObservacao, ForaDoFiltro, NotasObservacao, valorTexto } from './metadados'

export function RecorteBloco({ grupo, foraDoFiltro }: { grupo: GrupoRecorte; foraDoFiltro: boolean }) {
  const ordenadas = [...grupo.observacoes].sort((a, b) => valorNumerico(b) - valorNumerico(a))
  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{grupo.titulo}</CardTitle>
          <span className="flex gap-2">
            {foraDoFiltro ? <ForaDoFiltro /> : null}
            {ordenadas.some((o) => o.demonstracao) ? <DemoBadge /> : null}
          </span>
        </div>
        <CardDescription>
          Por recorte de origem, em {grupo.unidade.nome}. Recortes podem se sobrepor e não são somados.
        </CardDescription>
        <p className="text-xs font-semibold text-brand-purple">Referência: {grupo.referencia.rotulo}</p>
        <Abrangencia territorio={grupo.territorio} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <HorizontalBars
          data={ordenadas.map((o) => ({
            key: o.id,
            label: o.categoria?.nome ?? 'Total',
            valor: valorNumerico(o),
            rotulo: valorTexto(o),
            title: o.categoria?.nome,
          }))}
        />
        <details className="text-[13px]">
          <summary className="cursor-pointer font-medium text-brand-purple">Ver dados em tabela</summary>
          <DataTable
            className="mt-3"
            caption={`${grupo.titulo}: ${grupo.referencia.rotulo}`}
            columns={[
              { key: 'recorte', header: 'Recorte' },
              { key: 'valor', header: 'Valor', align: 'right' },
              { key: 'notas', header: 'Notas' },
            ]}
            rows={ordenadas.map((o) => ({
              key: o.id,
              cells: { recorte: o.categoria?.nome ?? 'Total', valor: valorTexto(o), notas: o.notas.join(' ') || '—' },
            }))}
          />
        </details>
        <FonteObservacao fontes={fontesDistintas(ordenadas)} />
        <NotasObservacao notas={notasDe(ordenadas)} />
      </CardContent>
    </Card>
  )
}
