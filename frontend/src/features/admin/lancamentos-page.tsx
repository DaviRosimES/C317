import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import {
  Alert,
  Button,
  DemoBadge,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FilterChip,
  FilterChips,
  ListRow,
  Skeleton,
} from '@/components/ui'
import { formatValorIndicador } from '@/lib/format'
import { formatPeriodo } from '@/lib/periodo'
import type { LancamentosSearch } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import type { Lancamento, StatusLancamento } from '@/models'
import { useCnaes } from '@/queries/consulta.queries'
import { useLancamentos, usePublicarLancamento } from '@/queries/lancamento.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { LinksConsultaPublica, StatusBadge, descreverRecorte } from './lancamento-resumo'

const TODOS = 'todos'
const FILTROS = [
  { valor: TODOS, rotulo: 'Todos' },
  { valor: 'rascunho', rotulo: 'Rascunhos' },
  { valor: 'publicado', rotulo: 'Publicados' },
] as const

const VAZIO: Record<string, string> = {
  [TODOS]: 'Nenhum lançamento cadastrado',
  rascunho: 'Nenhum rascunho pendente',
  publicado: 'Nenhum lançamento publicado',
}

export function LancamentosPage({ search }: { search: LancamentosSearch }) {
  const navigate = useNavigate()
  const lancamentos = useLancamentos({ status: search.status })
  const cnaes = useCnaes()
  const publicar = usePublicarLancamento()
  const [confirmando, setConfirmando] = React.useState<Lancamento | null>(null)
  const [publicado, setPublicado] = React.useState<Lancamento | null>(null)

  function confirmarPublicacao() {
    if (!confirmando) return
    publicar.mutate(confirmando.id, {
      onSuccess: (lancamento) => {
        setPublicado(lancamento)
        setConfirmando(null)
      },
    })
  }

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Lançamentos de indicadores"
        description="Rascunhos ficam fora da consulta pública; publique-os depois de conferir valor, período e fonte."
        actions={
          <Button asChild variant="gradient">
            <Link to="/admin/lancamentos/novo">
              <Plus aria-hidden />
              Novo lançamento
            </Link>
          </Button>
        }
      />

      {publicado ? (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <div className="flex flex-col gap-3">
            <p>
              <strong className="font-semibold">
                {publicado.nome} · {formatPeriodo(publicado.periodo)}
              </strong>{' '}
              publicado. O valor já aparece na consulta pública.
            </p>
            <div className="flex flex-wrap gap-2">
              <LinksConsultaPublica lancamento={publicado} />
            </div>
          </div>
        </Alert>
      ) : null}

      <FilterChips
        aria-label="Situação"
        value={search.status ?? TODOS}
        onValueChange={(valor) =>
          void navigate({
            to: '/admin/lancamentos',
            search: { status: valor === TODOS ? undefined : (valor as StatusLancamento) },
          })
        }
      >
        {FILTROS.map((filtro) => (
          <FilterChip key={filtro.valor} value={filtro.valor}>
            {filtro.rotulo}
          </FilterChip>
        ))}
      </FilterChips>

      <section aria-live="polite" className={cn('flex flex-col gap-3', lancamentos.isFetching && 'opacity-70')}>
        {lancamentos.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : lancamentos.error ? (
          <EmptyState title="Não foi possível carregar os lançamentos" description={lancamentos.error.message} />
        ) : lancamentos.data.length ? (
          lancamentos.data.map((lancamento) => (
            <ListRow
              key={lancamento.id}
              title={lancamento.nome}
              subtitle={`${formatPeriodo(lancamento.periodo, 'longo')} · ${descreverRecorte(lancamento, cnaes.data)}`}
              meta={
                <>
                  <span className="line-clamp-2 break-words">Fonte: {lancamento.fonte}</span>
                  {lancamento.demonstracao ? <DemoBadge /> : null}
                </>
              }
              aside={
                <>
                  <span className="text-lg font-bold tabular-nums text-ink">
                    {formatValorIndicador(lancamento.valor, lancamento.unidade)}
                  </span>
                  <StatusBadge status={lancamento.status} />
                </>
              }
              actions={
                <>
                  <Button asChild variant="secondary" size="sm" className="flex-1 sm:flex-none">
                    <Link to="/admin/lancamentos/$lancamentoId" params={{ lancamentoId: lancamento.id }}>
                      Editar
                    </Link>
                  </Button>
                  {lancamento.status === 'rascunho' ? (
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        publicar.reset()
                        setConfirmando(lancamento)
                      }}
                    >
                      Publicar
                    </Button>
                  ) : null}
                </>
              }
            />
          ))
        ) : (
          <EmptyState
            title={VAZIO[search.status ?? TODOS]}
            action={
              <Button asChild variant="secondary">
                <Link to="/admin/lancamentos/novo">Cadastrar lançamento</Link>
              </Button>
            }
          />
        )}
      </section>

      <Dialog open={!!confirmando} onOpenChange={(aberto) => !aberto && setConfirmando(null)}>
        <DialogContent>
          {confirmando ? (
            <>
              <DialogHeader>
                <DialogTitle>Publicar lançamento?</DialogTitle>
                <DialogDescription>O valor ficará visível na consulta pública, junto da fonte informada.</DialogDescription>
              </DialogHeader>
              <dl className="grid gap-3 rounded-lg bg-canvas p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Indicador</dt>
                  <dd className="text-right font-medium text-ink">{confirmando.nome}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Período</dt>
                  <dd className="text-right text-ink">{formatPeriodo(confirmando.periodo, 'longo')}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Recorte</dt>
                  <dd className="text-right text-ink">{descreverRecorte(confirmando, cnaes.data)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Valor</dt>
                  <dd className="text-right font-bold tabular-nums text-ink">
                    {formatValorIndicador(confirmando.valor, confirmando.unidade)}
                  </dd>
                </div>
              </dl>
              {publicar.error ? (
                <Alert variant="danger" className="mt-4">
                  <AlertCircle aria-hidden />
                  <p>{publicar.error.message}</p>
                </Alert>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button variant="gradient" disabled={publicar.isPending} onClick={confirmarPublicacao}>
                  {publicar.isPending ? 'Publicando…' : 'Publicar'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminContainer>
  )
}
