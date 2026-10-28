import { createFileRoute } from '@tanstack/react-router'
import { NovaObservacaoPage } from '@/features/admin/nova-observacao-page'
import { cnaesQueryOptions } from '@/queries/consulta.queries'
import { catalogosObservacoesQueryOptions } from '@/queries/observacao.queries'

export const Route = createFileRoute('/admin/_autenticado/observacoes/nova')({
  // Catálogos sempre atualizados: um indicador, categoria ou fonte recém-carregado aparece no formulário.
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery({ ...catalogosObservacoesQueryOptions, staleTime: 0 })
    void queryClient.prefetchQuery({ ...cnaesQueryOptions, staleTime: 0 })
  },
  component: NovaObservacaoPage,
})
