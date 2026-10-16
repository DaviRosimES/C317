import { createFileRoute, redirect } from '@tanstack/react-router'
import { ApiError } from '@/api/http/api-error'
import { AdminLayout } from '@/features/admin/admin-layout'
import type { MotivoLogin } from '@/lib/schemas'
import { ehAdmin, estadoSessao, usuarioAtualQueryOptions } from '@/queries/auth.queries'

/** Telas administrativas: sem sessão válida, o acesso direto encaminha para o login. */
export const Route = createFileRoute('/admin/_autenticado')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const paraLogin = (motivo?: MotivoLogin) =>
      redirect({ to: '/admin/login', search: { redirect: location.href, motivo }, replace: true })

    const estado = estadoSessao()
    if (estado !== 'ativa') throw paraLogin(estado === 'expirada' ? 'expirada' : undefined)

    const usuario = await queryClient.ensureQueryData(usuarioAtualQueryOptions).catch((erro: unknown) => {
      // 401: token recusado pela API; a sessão já foi encerrada pelo cliente HTTP.
      if (erro instanceof ApiError && erro.status === 401) return null
      throw erro
    })
    if (!usuario) throw paraLogin('expirada')
    if (!ehAdmin(usuario)) throw paraLogin('sem-permissao')
    return { usuario }
  },
  component: function AdminRoute() {
    const { usuario } = Route.useRouteContext()
    return <AdminLayout usuario={usuario} />
  },
})
