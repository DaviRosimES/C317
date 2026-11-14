import { createFileRoute } from '@tanstack/react-router'
import { NovaDefinicaoPage } from '@/features/admin/nova-definicao-page'
import { catalogosAdminQueryOptions } from '@/queries/admin-definicao.queries'

export const Route = createFileRoute('/admin/_autenticado/indicadores/novo')({
  // Catálogos sempre atualizados: uma classificação recém-cadastrada aparece no formulário.
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery({ ...catalogosAdminQueryOptions, staleTime: 0 })
  },
  component: NovaDefinicaoPage,
})
