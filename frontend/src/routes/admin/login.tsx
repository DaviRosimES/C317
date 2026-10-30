import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginPage } from '@/features/admin/login-page'
import { loginSearchSchema } from '@/lib/schemas'
import { ehAdmin, estadoSessao, usuarioAtualQueryOptions } from '@/queries/auth.queries'

export const Route = createFileRoute('/admin/login')({
  validateSearch: loginSearchSchema,
  // Quem já tem sessão válida segue direto para a área administrativa.
  beforeLoad: async ({ context: { queryClient }, search }) => {
    if (estadoSessao() !== 'ativa') return
    const usuario = await queryClient.ensureQueryData(usuarioAtualQueryOptions).catch(() => null)
    if (usuario && ehAdmin(usuario)) throw redirect({ href: search.redirect ?? '/admin/observacoes', replace: true })
  },
  component: function LoginRoute() {
    return <LoginPage search={Route.useSearch()} />
  },
})
