import { createFileRoute } from '@tanstack/react-router'
import { NovoDadoPage } from '@/features/admin/novo-dado-page'
import { novoDadoSearchSchema } from '@/lib/schemas'
import { catalogosAdminQueryOptions, definicoesQueryOptions } from '@/queries/admin-definicao.queries'

export const Route = createFileRoute('/admin/_autenticado/dados/novo')({
  validateSearch: novoDadoSearchSchema,
  // Catálogos sempre atualizados: uma fonte ou categoria recém-cadastrada aparece no formulário.
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery({ ...catalogosAdminQueryOptions, staleTime: 0 })
    void queryClient.prefetchQuery(definicoesQueryOptions({ situacao: 'todos' }))
  },
  component: function NovoDadoRoute() {
    return <NovoDadoPage indicador={Route.useSearch().indicador} />
  },
})
