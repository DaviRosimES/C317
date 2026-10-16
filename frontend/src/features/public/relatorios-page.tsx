import { Download } from 'lucide-react'
import { PublicContainer, PublicPageHeader } from '@/components/layout/public-layout'
import { Button, DemoBadge, EmptyState, ListRow, ListRowThumb, Skeleton } from '@/components/ui'
import { formatDate } from '@/lib/format'
import { formatPeriodo } from '@/lib/periodo'
import { useRelatorios } from '@/queries/relatorio.queries'

const toIsoDate = (data: Date) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`

export function RelatoriosPage() {
  const relatorios = useRelatorios()

  return (
    <PublicContainer>
      <PublicPageHeader
        eyebrow="Publicações"
        title="Relatórios"
        description="Boletins e estudos publicados pelo Observatório. Consulte a referência e a fonte de cada relatório e baixe o PDF."
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
              leading={<ListRowThumb>PDF</ListRowThumb>}
              title={relatorio.titulo}
              subtitle={
                <>
                  Referência: {formatPeriodo(relatorio.periodo, 'longo')} · Publicado em{' '}
                  <time dateTime={toIsoDate(relatorio.dataPublicacao)}>{formatDate(relatorio.dataPublicacao)}</time>
                </>
              }
              meta={
                <>
                  <span className="break-words">Fonte: {relatorio.fonte}</span>
                  {relatorio.demonstracao ? <DemoBadge /> : null}
                </>
              }
              actions={
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  <a href={relatorio.urlArquivo} download aria-label={`Baixar PDF: ${relatorio.titulo}`}>
                    <Download aria-hidden />
                    Baixar PDF
                  </a>
                </Button>
              }
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
