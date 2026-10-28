import { Download, ExternalLink } from 'lucide-react'
import { PublicContainer, PublicPageHeader } from '@/components/layout/public-layout'
import { Badge, Button, DemoBadge, EmptyState, ListRow, ListRowThumb, Skeleton } from '@/components/ui'
import { formatDate, toDataIso } from '@/lib/format'
import { formatPeriodo } from '@/lib/periodo'
import type { Relatorio, TipoRelatorio } from '@/models'
import { useRelatorios } from '@/queries/relatorio.queries'

const TIPOS: Record<TipoRelatorio, string> = {
  relatorio_tecnico: 'Relatório técnico',
  peca_divulgacao: 'Peça de divulgação',
}

/** Número, referência e data aparecem somente quando a fonte os informa. */
function identificacao(relatorio: Relatorio) {
  const partes = [
    relatorio.numero ? <span key="numero">Nº {relatorio.numero}</span> : null,
    relatorio.periodo ? <span key="referencia">Referência: {formatPeriodo(relatorio.periodo, 'longo')}</span> : null,
    relatorio.dataPublicacao ? (
      <span key="data">
        Publicado em <time dateTime={toDataIso(relatorio.dataPublicacao)}>{formatDate(relatorio.dataPublicacao)}</time>
      </span>
    ) : null,
  ].filter(Boolean)
  return partes.length ? <>{partes.flatMap((parte, i) => (i ? [' · ', parte] : [parte]))}</> : undefined
}

function Acesso({ relatorio }: { relatorio: Relatorio }) {
  const { acesso } = relatorio
  if (acesso.tipo === 'arquivo') {
    return (
      <Button asChild variant="secondary" className="w-full sm:w-auto">
        <a href={acesso.url} download aria-label={`Baixar PDF: ${relatorio.titulo}`}>
          <Download aria-hidden />
          Baixar PDF
        </a>
      </Button>
    )
  }
  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto sm:items-end">
      <Button asChild variant="secondary" className="w-full sm:w-auto">
        <a href={acesso.url} target="_blank" rel="noreferrer" aria-label={`Abrir em ${acesso.destino} (nova aba): ${relatorio.titulo}`}>
          <ExternalLink aria-hidden />
          Abrir documento
        </a>
      </Button>
      <span className="text-center text-xs text-ink-muted sm:text-right">Abre em {acesso.destino}</span>
    </div>
  )
}

export function RelatoriosPage() {
  const relatorios = useRelatorios()

  return (
    <PublicContainer>
      <PublicPageHeader
        eyebrow="Publicações"
        title="Relatórios"
        description="Relatórios e estudos publicados pelo Observatório, com número, referência, data e fonte quando informados. Documentos publicados em outro endereço abrem no local de origem."
      />

      <section aria-label="Relatórios publicados" className="flex flex-col gap-4">
        {relatorios.isPending ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : relatorios.error ? (
          <EmptyState title="Não foi possível carregar os relatórios" description={relatorios.error.message} />
        ) : relatorios.data.length ? (
          relatorios.data.map((relatorio) => (
            <ListRow
              key={relatorio.id}
              leading={
                <ListRowThumb>{relatorio.acesso.tipo === 'arquivo' ? 'PDF' : <ExternalLink className="size-5" />}</ListRowThumb>
              }
              title={relatorio.titulo}
              subtitle={identificacao(relatorio)}
              meta={
                <>
                  {relatorio.tipo ? <Badge variant="neutral">{TIPOS[relatorio.tipo]}</Badge> : null}
                  <span className="break-words">Fonte: {relatorio.fonte}</span>
                  {relatorio.demonstracao ? <DemoBadge /> : null}
                </>
              }
              actions={<Acesso relatorio={relatorio} />}
            />
          ))
        ) : (
          <EmptyState
            title="Nenhum relatório disponível"
            description="Ainda não há relatórios publicados. Quando a equipe publicar um relatório, ele aparecerá aqui."
          />
        )}
      </section>
    </PublicContainer>
  )
}
