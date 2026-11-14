import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { DefinicaoPage } from '@/features/admin/definicao-page'
import { catalogosAdminQueryOptions, definicaoQueryOptions } from '@/queries/admin-definicao.queries'

export const Route = createFileRoute('/admin/_autenticado/indicadores/$codigo')({
  // `criado` só existe logo após o cadastro, para exibir o aviso de sucesso.
  validateSearch: z.object({ criado: z.literal(true).optional().catch(undefined) }),
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(definicaoQueryOptions(params.codigo))
    void queryClient.prefetchQuery(catalogosAdminQueryOptions)
  },
  component: function DefinicaoRoute() {
    return <DefinicaoPage codigo={Route.useParams().codigo} criado={Route.useSearch().criado === true} />
  },
})
