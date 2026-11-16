import { createFileRoute } from '@tanstack/react-router'
import { IndicadoresPage } from '@/features/public/indicadores/indicadores-page'
import { indicadoresSearchSchema } from '@/lib/schemas'
import { opcoesConsultaQueryOptions } from '@/queries/consulta-indicadores.queries'

export const Route = createFileRoute('/_public/indicadores')({
  validateSearch: indicadoresSearchSchema,
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(opcoesConsultaQueryOptions())
  },
  component: function IndicadoresRoute() {
    return <IndicadoresPage search={Route.useSearch()} />
  },
})
