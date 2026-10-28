import { createFileRoute } from '@tanstack/react-router'
import { ObservacoesPage, filtroDasObservacoes } from '@/features/admin/observacoes-page'
import { observacoesSearchSchema } from '@/lib/schemas'
import { observacoesAdminQueryOptions } from '@/queries/admin-observacao.queries'
import { catalogosObservacoesQueryOptions } from '@/queries/observacao.queries'

export const Route = createFileRoute('/admin/_autenticado/observacoes/')({
  validateSearch: observacoesSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(observacoesAdminQueryOptions(filtroDasObservacoes(deps)))
    void queryClient.prefetchQuery(catalogosObservacoesQueryOptions)
  },
  component: function ObservacoesRoute() {
    return <ObservacoesPage search={Route.useSearch()} />
  },
})
