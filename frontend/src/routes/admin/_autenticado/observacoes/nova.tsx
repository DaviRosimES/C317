import { createFileRoute } from '@tanstack/react-router'
import { NovaObservacaoPage } from '@/features/admin/nova-observacao-page'
import { catalogosAdminQueryOptions } from '@/queries/admin-observacao.queries'

export const Route = createFileRoute('/admin/_autenticado/observacoes/nova')({
  // Catálogos sempre atualizados: um indicador, categoria ou fonte recém-carregado aparece no formulário.
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery({ ...catalogosAdminQueryOptions, staleTime: 0 })
  },
  component: NovaObservacaoPage,
})
