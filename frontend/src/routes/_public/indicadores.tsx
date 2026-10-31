import { createFileRoute } from '@tanstack/react-router'
import { IndicadoresPage } from '@/features/public/indicadores-page'
import { consultaSearchSchema } from '@/lib/schemas'
import { catalogosObservacoesQueryOptions, observacoesQueryOptions } from '@/queries/observacao.queries'

export const Route = createFileRoute('/_public/indicadores')({
  validateSearch: consultaSearchSchema,
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(catalogosObservacoesQueryOptions)
    void queryClient.prefetchQuery(observacoesQueryOptions({}))
  },
  component: function IndicadoresRoute() {
    return <IndicadoresPage search={Route.useSearch()} />
  },
})
