import { createFileRoute } from '@tanstack/react-router'
import { LancamentosPage } from '@/features/admin/lancamentos-page'
import { lancamentosSearchSchema } from '@/lib/schemas'
import { cnaesQueryOptions } from '@/queries/consulta.queries'
import { lancamentosQueryOptions } from '@/queries/lancamento.queries'

export const Route = createFileRoute('/admin/_autenticado/lancamentos/')({
  validateSearch: lancamentosSearchSchema,
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(lancamentosQueryOptions(deps))
    void queryClient.prefetchQuery(cnaesQueryOptions)
  },
  component: function LancamentosRoute() {
    return <LancamentosPage search={Route.useSearch()} />
  },
})
