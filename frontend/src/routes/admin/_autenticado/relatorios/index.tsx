import { createFileRoute } from '@tanstack/react-router'
import { RelatoriosPage, filtroDosRelatorios } from '@/features/admin/relatorios-page'
import { relatoriosAdminSearchSchema } from '@/lib/schemas'
import { relatoriosAdminQueryOptions } from '@/queries/admin-relatorio.queries'

export const Route = createFileRoute('/admin/_autenticado/relatorios/')({
  validateSearch: relatoriosAdminSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(relatoriosAdminQueryOptions(filtroDosRelatorios(deps)))
  },
  component: function RelatoriosRoute() {
    return <RelatoriosPage search={Route.useSearch()} />
  },
})
