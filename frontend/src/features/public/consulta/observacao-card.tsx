import { Card, DemoBadge } from '@/components/ui'
import type { Observacao } from '@/models'
import { Abrangencia, FonteObservacao, ForaDoFiltro, NotasObservacao, valorTexto } from './metadados'

export function ObservacaoCard({ observacao: o, foraDoFiltro = false }: { observacao: Observacao; foraDoFiltro?: boolean }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-ink-muted">{o.categoria?.nome ?? 'Total'}</p>
        <span className="flex flex-wrap gap-2">
          {foraDoFiltro ? <ForaDoFiltro /> : null}
          {o.demonstracao ? <DemoBadge /> : null}
        </span>
      </div>
      <p className="break-words text-2xl font-bold leading-tight tracking-tight text-ink tabular-nums">{valorTexto(o)}</p>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-brand-purple">Referência: {o.referencia.rotulo}</p>
        <Abrangencia territorio={o.territorio} />
      </div>
      <FonteObservacao fontes={[o.fonte]} />
      <NotasObservacao notas={o.notas} />
    </Card>
  )
}
