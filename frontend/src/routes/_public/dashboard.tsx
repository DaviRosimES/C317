import { createFileRoute, redirect } from '@tanstack/react-router'

/** Caminho antigo do Dashboard: os gráficos e dados ficam em Indicadores. */
export const Route = createFileRoute('/_public/dashboard')({
  beforeLoad: () => {
    throw redirect({ to: '/indicadores', replace: true })
  },
})
