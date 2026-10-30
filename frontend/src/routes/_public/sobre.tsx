import { createFileRoute } from '@tanstack/react-router'
import { SobrePage } from '@/features/public/sobre-page'
import { catalogosObservacoesQueryOptions } from '@/queries/observacao.queries'

export const Route = createFileRoute('/_public/sobre')({
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(catalogosObservacoesQueryOptions)
  },
  component: SobrePage,
})
