import * as React from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { Globe, LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Usuario } from '@/models'
import { useFimDaSessao, useSair } from '@/queries/auth.queries'

const NAV = [{ to: '/', label: 'Portal público', icon: Globe }] as const

const navLinkClass =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-ink transition-colors hover:bg-sidebar-active hover:text-white focus-visible:shadow-focus data-[status=active]:bg-sidebar-active data-[status=active]:text-white [&_svg]:size-4 [&_svg]:shrink-0'

const sairClass = 'text-sidebar-ink hover:bg-sidebar-active hover:text-white'

export function AdminLayout({ usuario }: { usuario: Usuario }) {
  const navigate = useNavigate()
  const href = useLocation({ select: (location) => location.href })
  const sair = useSair()

  useFimDaSessao((motivo) =>
    navigate({
      to: '/admin/login',
      search: { motivo, redirect: motivo === 'expirada' ? href : undefined },
      replace: true,
    }),
  )

  return (
    <div className="flex min-h-dvh flex-col bg-canvas md:flex-row">
      <aside className="flex flex-col bg-sidebar text-sidebar-ink md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0">
        <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 md:pb-6 md:pt-7">
          <Link to="/" className="flex flex-col leading-none text-white focus-visible:shadow-focus">
            <span className="text-[17px] font-bold tracking-tight">observatório</span>
            <span className="text-[17px] font-bold tracking-tight">do turismo</span>
            <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-sidebar-ink">
              Área administrativa
            </span>
          </Link>
          <Button variant="ghost" size="sm" className={cn(sairClass, 'md:hidden')} onClick={sair}>
            <LogOut aria-hidden />
            Sair
          </Button>
        </div>

        <nav aria-label="Área administrativa" className="flex flex-wrap gap-1 px-3 pb-3 md:flex-col md:flex-nowrap md:pb-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: true, includeSearch: false }} className={navLinkClass}>
              <Icon aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden border-t border-sidebar-active px-6 py-5 md:block">
          <p className="truncate text-sm font-semibold text-white">{usuario.nome}</p>
          <p className="truncate text-xs">{usuario.email}</p>
          <Button variant="ghost" size="sm" className={cn(sairClass, 'mt-3 w-full justify-start px-2')} onClick={sair}>
            <LogOut aria-hidden />
            Sair da conta
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export function AdminContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-10 md:py-10', className)} {...props} />
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-ink md:text-[28px]">{title}</h1>
        {description ? <div className="text-sm text-ink-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}
