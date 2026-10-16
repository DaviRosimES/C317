import { createFileRoute } from '@tanstack/react-router'
import { NovoLancamentoPage } from '@/features/admin/novo-lancamento-page'
import { cnaesQueryOptions, tiposIndicadoresQueryOptions } from '@/queries/consulta.queries'

export const Route = createFileRoute('/admin/_autenticado/lancamentos/novo')({
  // Catálogos sempre atualizados: um CNAE ou tipo recém-cadastrado aparece no formulário.
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery({ ...cnaesQueryOptions, staleTime: 0 })
    void queryClient.prefetchQuery({ ...tiposIndicadoresQueryOptions, staleTime: 0 })
  },
  component: NovoLancamentoPage,
})
