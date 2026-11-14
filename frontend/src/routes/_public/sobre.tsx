import { createFileRoute } from '@tanstack/react-router'
import { SobrePage } from '@/features/public/sobre-page'
import { fontesPublicasQueryOptions } from '@/queries/fonte-consulta.queries'

export const Route = createFileRoute('/_public/sobre')({
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(fontesPublicasQueryOptions)
  },
  component: SobrePage,
})
