import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { errorMessage } from '@/api/http/api-error'
import { Button } from '@/components/ui'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: ({ error, reset }) => (
    <main className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-xl font-bold text-ink">Algo deu errado</h1>
      <p className="text-sm text-ink-muted">{errorMessage(error)}</p>
      <div className="flex gap-3">
        <Button variant="gradient" onClick={reset}>
          Tentar novamente
        </Button>
        <Button asChild variant="secondary">
          <Link to="/">Voltar ao dashboard</Link>
        </Button>
      </div>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-6 py-16">
      <p className="text-sm text-ink-muted">Página não encontrada.</p>
      <Button asChild variant="secondary">
        <Link to="/">Voltar ao dashboard</Link>
      </Button>
    </main>
  ),
})

function RootLayout() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV ? (
        <>
          <TanStackRouterDevtools position="bottom-left" />
          <ReactQueryDevtools buttonPosition="bottom-right" />
        </>
      ) : null}
    </>
  )
}
