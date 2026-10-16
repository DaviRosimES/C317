import { createFileRoute } from '@tanstack/react-router'
import { RelatoriosPage } from '@/features/public/relatorios-page'
import { relatoriosQueryOptions } from '@/queries/relatorio.queries'

export const Route = createFileRoute('/_public/relatorios')({
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(relatoriosQueryOptions)
  },
  component: RelatoriosPage,
})
