import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  EmptyState,
  FormField,
  ListRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@/components/ui'
import type { DadosSearch } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import type { DadoIndicadorAdmin, DadosAdminFiltro, DefinicaoIndicador } from '@/models'
import { useDadosIndicador } from '@/queries/admin-dado-indicador.queries'
import { useDefinicoes } from '@/queries/admin-definicao.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { DialogoPublicar } from './dado-acoes'
import { SituacaoDado, descreverRecorte, valorDado } from './dado-resumo'
import { TEXTOS_ADMIN } from './textos'

const BLOCO = 50
const TODOS = 'todos'

/** Filtros da URL → filtro da API. Usado também pelo loader da rota. */
export const filtroDosDados = (search: DadosSearch): DadosAdminFiltro => ({
  indicador: search.indicador,
  situacao: search.situacao ?? 'ativos',
  status: search.status,
})

export function DadosPage({ search }: { search: DadosSearch }) {
  const navigate = useNavigate()
  const definicoes = useDefinicoes({ situacao: 'todos' })
  const dados = useDadosIndicador(filtroDosDados(search))
  const [confirmando, setConfirmando] = React.useState<DadoIndicadorAdmin | null>(null)
  const [publicado, setPublicado] = React.useState<DadoIndicadorAdmin | null>(null)

  const buscar = (novo: DadosSearch) => void navigate({ to: '/admin/dados', search: novo })
  const filtrosAtivos = !!(search.indicador || search.status || search.situacao)

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Dados do indicador"
        description={TEXTOS_ADMIN.dados}
        actions={
          <Button asChild variant="gradient">
            <Link to="/admin/dados/novo" search={{ indicador: search.indicador }}>
              <Plus aria-hidden />
              Adicionar dado
            </Link>
          </Button>
        }
      />

      {publicado ? (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <p>
            <strong className="font-semibold">
              {publicado.indicador.nome} · {publicado.referencia.rotulo}
            </strong>{' '}
            publicado.{' '}
            <Link
              to="/admin/dados/$dadoId"
              params={{ dadoId: publicado.id }}
              className="font-semibold text-brand-purple underline-offset-4 hover:underline"
            >
              Abrir
            </Link>
          </p>
        </Alert>
      ) : null}

      {definicoes.data ? (
        <FiltrosDados
          // Recriado quando a URL muda, descartando o rascunho anterior dos filtros.
          key={JSON.stringify(search)}
          search={search}
          definicoes={definicoes.data}
          onAplicar={buscar}
          onLimpar={filtrosAtivos ? () => buscar({}) : undefined}
        />
      ) : definicoes.isPending ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : (
        <Alert variant="danger">
          <AlertCircle aria-hidden />
          <p>Não foi possível carregar os filtros: {definicoes.error.message}</p>
        </Alert>
      )}

      <section aria-live="polite" className={cn('flex flex-col gap-3', dados.isFetching && !dados.isPending && 'opacity-70')}>
        {dados.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : !dados.data ? (
          <EmptyState
            title="Não foi possível carregar os dados"
            description={dados.error?.message}
            action={
              <Button variant="secondary" onClick={() => void dados.refetch()}>
                Tentar de novo
              </Button>
            }
          />
        ) : dados.data.length ? (
          // A API devolve a lista inteira; os blocos são só da tela e recomeçam a cada filtro.
          <ListaDados key={JSON.stringify(search)} dados={dados.data} onPublicar={setConfirmando} />
        ) : (
          <EmptyState
            title="Nenhum dado para estes filtros"
            description={
              filtrosAtivos
                ? 'Altere ou limpe os filtros, ou cadastre um dado para o indicador.'
                : 'Escolha um indicador ativo e cadastre o primeiro dado.'
            }
            action={
              <Button asChild variant="secondary">
                <Link to="/admin/dados/novo" search={{ indicador: search.indicador }}>
                  Adicionar dado
                </Link>
              </Button>
            }
          />
        )}
      </section>

      <DialogoPublicar dado={confirmando} onFechar={() => setConfirmando(null)} onPublicado={setPublicado} />
    </AdminContainer>
  )
}

function ListaDados({ dados, onPublicar }: { dados: DadoIndicadorAdmin[]; onPublicar: (dado: DadoIndicadorAdmin) => void }) {
  const [limite, setLimite] = React.useState(BLOCO)
  const visiveis = dados.slice(0, limite)
  const restantes = dados.length - visiveis.length
  return (
    <>
      <p className="text-[13px] text-ink-muted">{dados.length === 1 ? '1 dado' : `${dados.length.toLocaleString('pt-BR')} dados`}</p>
      {visiveis.map((d) => (
        <ListRow
          key={d.id}
          title={d.indicador.nome}
          subtitle={`${descreverRecorte(d)} · ${d.referencia.rotulo}`}
          meta={
            <>
              <span className="min-w-0 break-words">Fonte: {d.fonte.nome}</span>
              <span>{d.visivelPublicamente ? 'Visível na consulta pública' : 'Fora da consulta pública'}</span>
            </>
          }
          aside={
            <div className="flex min-w-0 flex-col gap-2 sm:items-end">
              <span className="break-all text-lg font-bold tabular-nums text-ink">{valorDado(d)}</span>
              <SituacaoDado dado={d} />
            </div>
          }
          actions={
            <>
              <Button asChild variant="secondary" size="sm" className="flex-1 sm:flex-none">
                <Link to="/admin/dados/$dadoId" params={{ dadoId: d.id }}>
                  Abrir
                </Link>
              </Button>
              {d.status === 'rascunho' && !d.arquivado && !d.divulgacaoBloqueada && !d.indicador.arquivado ? (
                <Button size="sm" className="flex-1 sm:flex-none" onClick={() => onPublicar(d)}>
                  Publicar
                </Button>
              ) : null}
            </>
          }
        />
      ))}
      {restantes > 0 ? (
        <Button variant="secondary" className="self-center" onClick={() => setLimite((atual) => atual + BLOCO)}>
          Mostrar mais ({restantes.toLocaleString('pt-BR')} restantes)
        </Button>
      ) : null}
    </>
  )
}

const SITUACOES = [
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'arquivados', rotulo: 'Arquivados' },
  { valor: 'todos', rotulo: 'Todos' },
] as const

const STATUS = [
  { valor: TODOS, rotulo: 'Todos' },
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'publicado', rotulo: 'Publicado' },
] as const

/** Rascunho local dos filtros; a consulta só muda ao aplicar. */
function FiltrosDados({
  search,
  definicoes,
  onAplicar,
  onLimpar,
}: {
  search: DadosSearch
  definicoes: DefinicaoIndicador[]
  onAplicar: (filtros: DadosSearch) => void
  onLimpar?: () => void
}) {
  const [rascunho, setRascunho] = React.useState<DadosSearch>(search)

  function aplicar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // "Ativos" é o padrão e não precisa constar da URL.
    onAplicar({ ...rascunho, situacao: rascunho.situacao === 'ativos' ? undefined : rascunho.situacao })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form noValidate onSubmit={aplicar} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Indicador" labelVariant="field" htmlFor="filtro-indicador">
              <Select
                value={rascunho.indicador ?? TODOS}
                onValueChange={(valor) => setRascunho((atual) => ({ ...atual, indicador: valor === TODOS ? undefined : valor }))}
              >
                <SelectTrigger id="filtro-indicador">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {definicoes.map((d) => (
                    <SelectItem key={d.codigo} value={d.codigo} className="whitespace-normal">
                      {d.nome}
                      {d.arquivado ? ' (arquivado)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Status" labelVariant="field" htmlFor="filtro-status">
              <Select
                value={rascunho.status ?? TODOS}
                onValueChange={(valor) =>
                  setRascunho((atual) => ({ ...atual, status: valor === TODOS ? undefined : (valor as DadosSearch['status']) }))
                }
              >
                <SelectTrigger id="filtro-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => (
                    <SelectItem key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Situação" labelVariant="field" htmlFor="filtro-situacao">
              <Select
                value={rascunho.situacao ?? 'ativos'}
                onValueChange={(valor) => setRascunho((atual) => ({ ...atual, situacao: valor as DadosSearch['situacao'] }))}
              >
                <SelectTrigger id="filtro-situacao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SITUACOES.map((s) => (
                    <SelectItem key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            {onLimpar ? (
              <Button type="button" variant="ghost" onClick={onLimpar}>
                Limpar filtros
              </Button>
            ) : null}
            <Button type="submit" variant="secondary">
              Aplicar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
