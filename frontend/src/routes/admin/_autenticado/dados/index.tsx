import { createFileRoute } from '@tanstack/react-router'
import { DadosPage, filtroDosDados } from '@/features/admin/dados-page'
import { dadosSearchSchema } from '@/lib/schemas'
import { dadosIndicadorQueryOptions } from '@/queries/admin-dado-indicador.queries'
import { definicoesQueryOptions } from '@/queries/admin-definicao.queries'

export const Route = createFileRoute('/admin/_autenticado/dados/')({
  validateSearch: dadosSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(dadosIndicadorQueryOptions(filtroDosDados(deps)))
    void queryClient.prefetchQuery(definicoesQueryOptions({ situacao: 'todos' }))
  },
  component: function DadosRoute() {
    return <DadosPage search={Route.useSearch()} />
  },
})
