import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/_autenticado/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/lancamentos', replace: true })
  },
})
