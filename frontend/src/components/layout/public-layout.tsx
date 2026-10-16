import * as React from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Brand } from './brand'

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/indicadores', label: 'Indicadores' },
  { href: '/relatorios', label: 'Relatórios' },
  { to: '/inventario', label: 'Inventário' },
  { to: '/sobre', label: 'Sobre' },
] as const

const ADMIN_HREF = '/admin/login'

const navLinkClass =
  'relative px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:shadow-focus data-[status=active]:text-brand-purple'

function NavLinks({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  return (
    <nav aria-label="Navegação principal" className={className}>
      {NAV.map((item) =>
        'href' in item ? (
          <a key={item.href} href={item.href} onClick={onNavigate} className={navLinkClass}>
            {item.label}
          </a>
        ) : (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.to === '/' }}
            className={navLinkClass}
          >
            {({ isActive }) => (
              <>
                {item.label}
                {isActive ? (
                  <span aria-hidden className="absolute inset-x-3 -bottom-[17px] hidden h-[3px] rounded-full bg-brand-purple md:block" />
                ) : null}
              </>
            )}
          </Link>
        ),
      )}
    </nav>
  )
}

function PublicHeader() {
  const [open, setOpen] = React.useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 md:px-16">
        <Brand />
        <NavLinks className="hidden items-center gap-4 md:flex" />
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" className="hidden sm:inline-flex">
            <a href={ADMIN_HREF}>Área administrativa</a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line px-4 pb-4 md:hidden">
          <NavLinks onNavigate={() => setOpen(false)} className="flex flex-col py-2" />
          <Button asChild variant="secondary" className="w-full">
            <a href={ADMIN_HREF} onClick={() => setOpen(false)}>
              Área administrativa
            </a>
          </Button>
        </div>
      ) : null}
    </header>
  )
}

function PublicFooter() {
  return (
    <footer className="bg-sidebar text-xs text-sidebar-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-16">
        <p className="font-medium text-white">Prefeitura de Santa Rita do Sapucaí · SMCELT</p>
        <p>HEIComp 2026.2 · Inatel</p>
      </div>
    </footer>
  )
}

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

export function PublicPageHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {eyebrow ? <p className="eyebrow text-brand-purple">{eyebrow}</p> : null}
      <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink md:text-[32px]">{title}</h1>
      {description ? <p className="text-sm text-ink-muted">{description}</p> : null}
    </div>
  )
}

export function PublicContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:px-16 md:py-12', className)} {...props} />
}
