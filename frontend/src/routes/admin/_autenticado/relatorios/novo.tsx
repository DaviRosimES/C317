import { createFileRoute } from '@tanstack/react-router'
import { NovoRelatorioPage } from '@/features/admin/novo-relatorio-page'
import { limitesRelatorioQueryOptions } from '@/queries/admin-relatorio.queries'

export const Route = createFileRoute('/admin/_autenticado/relatorios/novo')({
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(limitesRelatorioQueryOptions)
  },
  component: NovoRelatorioPage,
})
