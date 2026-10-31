import { Badge, SourceLinks } from '@/components/ui'
import { rotuloAbrangencia, tipoTerritorioConhecido } from '@/lib/catalogo-observacoes'
import { formatValorObservacao } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Fonte, Observacao, Territorio } from '@/models'

export const valorTexto = (o: Observacao) => formatValorObservacao(o.valorExibicao, o.unidade, o.qualificador)

export function FonteObservacao({ fontes, className }: { fontes: Fonte[]; className?: string }) {
  if (!fontes.length) return null
  return (
    <div className={cn('flex flex-col gap-2 text-xs text-ink-muted', className)}>
      {fontes.map((fonte) => (
        <div key={fonte.codigo} className="flex flex-col gap-1">
          <p>
            <span className="font-medium text-ink">Fonte:</span> {fonte.nome}
          </p>
          <SourceLinks links={fonte.links} />
        </div>
      ))}
    </div>
  )
}

export function NotasObservacao({ notas, titulo = 'Notas', className }: { notas: string[]; titulo?: string; className?: string }) {
  if (!notas.length) return null
  return (
    <div className={cn('rounded-lg bg-canvas px-3 py-2 text-xs text-ink-muted', className)}>
      <p className="font-medium text-ink">{titulo}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {notas.map((nota) => (
          <li key={nota}>{nota}</li>
        ))}
      </ul>
    </div>
  )
}

export function Abrangencia({ territorio }: { territorio: Territorio }) {
  if (!tipoTerritorioConhecido(territorio.tipo)) {
    return (
      <Badge variant="warning" title="Tipo de território ainda não reconhecido pela interface">
        {territorio.nome} · abrangência não reconhecida ({territorio.tipo})
      </Badge>
    )
  }
  return (
    <span className="text-xs text-ink-muted">
      {territorio.nome}
      {territorio.tipo !== 'municipio' ? ` · ${rotuloAbrangencia(territorio.tipo)}` : ''}
    </span>
  )
}

export function ForaDoFiltro() {
  return (
    <Badge variant="neutral" className="h-6 px-2 text-[10px]">
      Filtro de recorte não se aplica
    </Badge>
  )
}
