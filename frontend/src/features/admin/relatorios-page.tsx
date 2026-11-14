import { Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { Button, EmptyState, FilterChip, FilterChips, ListRow, Skeleton } from '@/components/ui'
import { formatDate, toDataIso } from '@/lib/format'
import { formatPeriodo } from '@/lib/periodo'
import type { RelatoriosAdminSearch } from '@/lib/schemas'
import type { RelatorioAdmin, RelatoriosAdminFiltro } from '@/models'
import { useRelatoriosAdmin } from '@/queries/admin-relatorio.queries'
import { TIPOS_RELATORIO } from './relatorio-form'
import { SituacaoBadges } from './situacao'
import { TEXTOS_ADMIN } from './textos'

const SITUACOES = [
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'arquivados', rotulo: 'Arquivados' },
  { valor: 'todos', rotulo: 'Todos' },
] as const

const STATUS = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'publicado', rotulo: 'Publicado' },
] as const

export const filtroDosRelatorios = (search: RelatoriosAdminSearch): RelatoriosAdminFiltro => ({
  situacao: search.situacao,
  status: search.status,
})

/** Só o que é conhecido: nunca inventa número, tipo, referência ou data. */
export function identificacaoRelatorio(r: RelatorioAdmin) {
  const partes = [
    r.numero ? <span key="n">Nº {r.numero}</span> : null,
    r.tipo ? <span key="t">{TIPOS_RELATORIO[r.tipo]}</span> : null,
    r.periodo ? <span key="r">Referência: {formatPeriodo(r.periodo, 'longo')}</span> : null,
    r.dataPublicacao ? (
      <span key="d">
        Data original: <time dateTime={toDataIso(r.dataPublicacao)}>{formatDate(r.dataPublicacao)}</time>
      </span>
    ) : null,
  ].filter(Boolean)
  return partes.length ? <>{partes.flatMap((p, i) => (i ? [' · ', p] : [p]))}</> : undefined
}

export function conteudoVigente(r: RelatorioAdmin) {
  if (r.conteudo.tipo === 'pdf') return r.conteudo.nomeArquivo ? `PDF: ${r.conteudo.nomeArquivo}` : 'PDF'
  if (r.conteudo.tipo === 'link') return `Link externo (${r.conteudo.destino})`
  return 'Sem conteúdo'
}

export function RelatoriosPage({ search }: { search: RelatoriosAdminSearch }) {
  const navigate = useNavigate()
  const relatorios = useRelatoriosAdmin(filtroDosRelatorios(search))
  const buscar = (novo: RelatoriosAdminSearch) => void navigate({ to: '/admin/relatorios', search: novo })

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Relatórios"
        description={TEXTOS_ADMIN.relatorios}
        actions={
          <Button asChild variant="gradient">
            <Link to="/admin/relatorios/novo">
              <Plus aria-hidden />
              Novo relatório
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-medium text-ink-muted">Situação</span>
          <FilterChips
            aria-label="Situação"
            value={search.situacao ?? 'ativos'}
            onValueChange={(v) => buscar({ ...search, situacao: v === 'ativos' ? undefined : (v as RelatoriosAdminSearch['situacao']) })}
          >
            {SITUACOES.map((s) => (
              <FilterChip key={s.valor} value={s.valor}>
                {s.rotulo}
              </FilterChip>
            ))}
          </FilterChips>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-medium text-ink-muted">Status</span>
          <FilterChips
            aria-label="Status"
            value={search.status ?? 'todos'}
            onValueChange={(v) => buscar({ ...search, status: v === 'todos' ? undefined : (v as RelatoriosAdminSearch['status']) })}
          >
            {STATUS.map((s) => (
              <FilterChip key={s.valor} value={s.valor}>
                {s.rotulo}
              </FilterChip>
            ))}
          </FilterChips>
        </div>
      </div>

      <section aria-live="polite" aria-label="Relatórios" className="flex flex-col gap-3">
        {relatorios.isPending ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : relatorios.error ? (
          <EmptyState title="Não foi possível carregar os relatórios" description={relatorios.error.message} />
        ) : relatorios.data.length ? (
          relatorios.data.map((r) => (
            <ListRow
              key={r.id}
              title={r.titulo}
              subtitle={identificacaoRelatorio(r)}
              meta={
                <>
                  <span className="break-words">Fonte: {r.fonte ?? 'Fonte não confirmada'}</span>
                  <span className="break-all">{conteudoVigente(r)}</span>
                </>
              }
              aside={<SituacaoBadges status={r.status} arquivado={r.arquivado} demonstracao={r.demonstracao} />}
              actions={
                <Button asChild variant="secondary" size="sm" className="flex-1 sm:flex-none">
                  <Link to="/admin/relatorios/$relatorioId" params={{ relatorioId: r.id }}>
                    Abrir
                  </Link>
                </Button>
              }
            />
          ))
        ) : (
          <EmptyState
            title="Nenhum relatório para estes filtros"
            description="Altere os filtros ou cadastre um relatório."
            action={
              <Button asChild variant="secondary">
                <Link to="/admin/relatorios/novo">Novo relatório</Link>
              </Button>
            }
          />
        )}
      </section>
    </AdminContainer>
  )
}
