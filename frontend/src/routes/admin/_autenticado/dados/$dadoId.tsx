import { createFileRoute, notFound } from '@tanstack/react-router'
import { DadoPage } from '@/features/admin/dado-page'
import { dadoIndicadorQueryOptions } from '@/queries/admin-dado-indicador.queries'
import { catalogosAdminQueryOptions } from '@/queries/admin-definicao.queries'

export const Route = createFileRoute('/admin/_autenticado/dados/$dadoId')({
  params: {
    // O identificador do dado é um SHA-256 em hexadecimal.
    parse: ({ dadoId }) => {
      if (!/^[0-9a-f]{64}$/.test(dadoId)) throw notFound()
      return { dadoId }
    },
    stringify: ({ dadoId }) => ({ dadoId }),
  },
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(dadoIndicadorQueryOptions(params.dadoId))
    void queryClient.prefetchQuery(catalogosAdminQueryOptions)
  },
  component: function DadoRoute() {
    return <DadoPage id={Route.useParams().dadoId} />
  },
})
