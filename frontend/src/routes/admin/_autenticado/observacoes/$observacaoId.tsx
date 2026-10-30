import { createFileRoute, notFound } from '@tanstack/react-router'
import { ObservacaoPage } from '@/features/admin/observacao-page'
import { catalogosAdminQueryOptions, observacaoAdminQueryOptions } from '@/queries/admin-observacao.queries'

export const Route = createFileRoute('/admin/_autenticado/observacoes/$observacaoId')({
  params: {
    // A identidade da observação é um SHA-256 em hexadecimal.
    parse: ({ observacaoId }) => {
      if (!/^[0-9a-f]{64}$/.test(observacaoId)) throw notFound()
      return { observacaoId }
    },
    stringify: ({ observacaoId }) => ({ observacaoId }),
  },
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(observacaoAdminQueryOptions(params.observacaoId))
    void queryClient.prefetchQuery(catalogosAdminQueryOptions)
  },
  component: function ObservacaoRoute() {
    return <ObservacaoPage id={Route.useParams().observacaoId} />
  },
})
