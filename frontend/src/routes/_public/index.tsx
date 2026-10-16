import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/features/public/dashboard-page'
import { dashboardSearchSchema } from '@/lib/schemas'
import { cnaesQueryOptions, periodosQueryOptions, tiposIndicadoresQueryOptions } from '@/queries/consulta.queries'

export const Route = createFileRoute('/_public/')({
  validateSearch: dashboardSearchSchema,
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(periodosQueryOptions)
    void queryClient.prefetchQuery(cnaesQueryOptions)
    void queryClient.prefetchQuery(tiposIndicadoresQueryOptions)
  },
  component: function DashboardRoute() {
    return <DashboardPage search={Route.useSearch()} />
  },
})
