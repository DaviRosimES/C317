import { createFileRoute, notFound } from '@tanstack/react-router'
import { RelatorioPage } from '@/features/admin/relatorio-page'
import { limitesRelatorioQueryOptions, relatorioAdminQueryOptions } from '@/queries/admin-relatorio.queries'

export const Route = createFileRoute('/admin/_autenticado/relatorios/$relatorioId')({
  params: {
    parse: ({ relatorioId }) => {
      if (!/^[1-9]\d*$/.test(relatorioId)) throw notFound()
      return { relatorioId: Number(relatorioId) }
    },
    stringify: ({ relatorioId }) => ({ relatorioId: String(relatorioId) }),
  },
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(relatorioAdminQueryOptions(params.relatorioId))
    void queryClient.prefetchQuery(limitesRelatorioQueryOptions)
  },
  component: function RelatorioRoute() {
    return <RelatorioPage id={Route.useParams().relatorioId} />
  },
})
