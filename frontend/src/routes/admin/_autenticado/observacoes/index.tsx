import { createFileRoute } from '@tanstack/react-router'
import { ObservacoesPage, filtroDasObservacoes } from '@/features/admin/observacoes-page'
import { observacoesSearchSchema } from '@/lib/schemas'
import { catalogosAdminQueryOptions, observacoesAdminPaginasQueryOptions } from '@/queries/admin-observacao.queries'

export const Route = createFileRoute('/admin/_autenticado/observacoes/')({
  validateSearch: observacoesSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchInfiniteQuery(observacoesAdminPaginasQueryOptions(filtroDasObservacoes(deps)))
    void queryClient.prefetchQuery(catalogosAdminQueryOptions)
  },
  component: function ObservacoesRoute() {
    return <ObservacoesPage search={Route.useSearch()} />
  },
})
