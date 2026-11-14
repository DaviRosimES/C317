import { createFileRoute } from '@tanstack/react-router'
import { DefinicoesPage, filtroDasDefinicoes } from '@/features/admin/definicoes-page'
import { definicoesSearchSchema } from '@/lib/schemas'
import { catalogosAdminQueryOptions, definicoesQueryOptions } from '@/queries/admin-definicao.queries'

export const Route = createFileRoute('/admin/_autenticado/indicadores/')({
  validateSearch: definicoesSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(definicoesQueryOptions(filtroDasDefinicoes(deps)))
    void queryClient.prefetchQuery(catalogosAdminQueryOptions)
  },
  component: function DefinicoesRoute() {
    return <DefinicoesPage search={Route.useSearch()} />
  },
})
