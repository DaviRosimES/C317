import { createFileRoute } from '@tanstack/react-router'
import { IndicadoresPage } from '@/features/public/indicadores-page'
import { indicadoresSearchSchema } from '@/lib/schemas'
import { indicadoresQueryOptions, periodosQueryOptions, tiposIndicadoresQueryOptions } from '@/queries/consulta.queries'

export const Route = createFileRoute('/_public/indicadores')({
  validateSearch: indicadoresSearchSchema,
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(periodosQueryOptions)
    void queryClient.prefetchQuery(tiposIndicadoresQueryOptions)
    void queryClient.prefetchQuery(indicadoresQueryOptions({}))
  },
  component: function IndicadoresRoute() {
    return <IndicadoresPage search={Route.useSearch()} />
  },
})
