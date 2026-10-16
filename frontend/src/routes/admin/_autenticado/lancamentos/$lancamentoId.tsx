import { createFileRoute, notFound } from '@tanstack/react-router'
import { EditarLancamentoPage } from '@/features/admin/editar-lancamento-page'
import { cnaesQueryOptions, tiposIndicadoresQueryOptions } from '@/queries/consulta.queries'
import { lancamentoQueryOptions } from '@/queries/lancamento.queries'

export const Route = createFileRoute('/admin/_autenticado/lancamentos/$lancamentoId')({
  params: {
    parse: ({ lancamentoId }) => {
      const id = Number(lancamentoId)
      if (!Number.isInteger(id) || id <= 0) throw notFound()
      return { lancamentoId: id }
    },
    stringify: ({ lancamentoId }) => ({ lancamentoId: String(lancamentoId) }),
  },
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(lancamentoQueryOptions(params.lancamentoId))
    void queryClient.prefetchQuery({ ...cnaesQueryOptions, staleTime: 0 })
    void queryClient.prefetchQuery({ ...tiposIndicadoresQueryOptions, staleTime: 0 })
  },
  component: function EditarLancamentoRoute() {
    return <EditarLancamentoPage id={Route.useParams().lancamentoId} />
  },
})
