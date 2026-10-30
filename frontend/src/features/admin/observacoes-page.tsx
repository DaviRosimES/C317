import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  EmptyState,
  FilterChip,
  FilterChips,
  FormField,
  Input,
  ListRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@/components/ui'
import { TIPOS_REFERENCIA } from '@/lib/referencia'
import type { ObservacoesSearch, SituacaoObservacao as Situacao } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import type { Catalogos, ObservacaoAdmin, ObservacoesAdminFiltro } from '@/models'
import { useObservacoesAdmin } from '@/queries/admin-observacao.queries'
import { useCatalogosObservacoes } from '@/queries/observacao.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { DialogoPublicar } from './observacao-acoes'
import { SituacaoObservacao, descreverRecorte, valorExato } from './observacao-resumo'
import { ANO_INVALIDO, lerAno } from './observacao-validacao'

const TODAS = 'todas'
const POR_PAGINA = 30

const SITUACOES: { valor: Situacao | typeof TODAS; rotulo: string }[] = [
  { valor: TODAS, rotulo: 'Todas' },
  { valor: 'rascunho', rotulo: 'Aguardando publicação' },
  { valor: 'publicado', rotulo: 'Publicadas' },
  { valor: 'bloqueada', rotulo: 'Divulgação bloqueada' },
]

const FILTRO_SITUACAO: Record<Situacao, ObservacoesAdminFiltro> = {
  rascunho: { status: 'rascunho', divulgacaoBloqueada: false },
  publicado: { status: 'publicado' },
  bloqueada: { divulgacaoBloqueada: true },
}

/** Filtros da URL → filtro da API. Usado também pelo loader da rota. */
export function filtroDasObservacoes(search: ObservacoesSearch): ObservacoesAdminFiltro {
  return {
    ...(search.situacao ? FILTRO_SITUACAO[search.situacao] : {}),
    temas: search.tema ? [search.tema] : undefined,
    indicadores: search.indicador ? [search.indicador] : undefined,
    territorios: search.territorio ? [search.territorio] : undefined,
    referenciaTipos: search.referencia ? [search.referencia] : undefined,
    ano: search.ano,
  }
}

export function ObservacoesPage({ search }: { search: ObservacoesSearch }) {
  const navigate = useNavigate()
  const catalogos = useCatalogosObservacoes()
  const observacoes = useObservacoesAdmin(filtroDasObservacoes(search))
  const [quantidade, setQuantidade] = React.useState(POR_PAGINA)
  const [confirmando, setConfirmando] = React.useState<ObservacaoAdmin | null>(null)
  const [publicada, setPublicada] = React.useState<ObservacaoAdmin | null>(null)

  const buscar = (novo: ObservacoesSearch) => {
    setQuantidade(POR_PAGINA)
    void navigate({ to: '/admin/observacoes', search: novo })
  }

  const visiveis = observacoes.data?.slice(0, quantidade) ?? []
  const filtrosAtivos = Object.entries(search).some(([chave, valor]) => chave !== 'situacao' && valor !== undefined)

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Observações"
        description="Dados da M6 por indicador, território, recorte e referência. Confira os metadados e publique para exibir na consulta pública."
        actions={
          <Button asChild variant="gradient">
            <Link to="/admin/observacoes/nova">
              <Plus aria-hidden />
              Nova observação
            </Link>
          </Button>
        }
      />

      {publicada ? (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <p>
            <strong className="font-semibold">
              {publicada.indicador.nome} · {publicada.referencia.rotulo}
            </strong>{' '}
            publicada. Já aparece na consulta pública.{' '}
            <Link
              to="/admin/observacoes/$observacaoId"
              params={{ observacaoId: publicada.id }}
              className="font-semibold text-brand-purple underline-offset-4 hover:underline"
            >
              Abrir
            </Link>
          </p>
        </Alert>
      ) : null}

      <FilterChips
        aria-label="Situação"
        value={search.situacao ?? TODAS}
        onValueChange={(valor) => buscar({ ...search, situacao: valor === TODAS ? undefined : (valor as Situacao) })}
      >
        {SITUACOES.map((situacao) => (
          <FilterChip key={situacao.valor} value={situacao.valor}>
            {situacao.rotulo}
          </FilterChip>
        ))}
      </FilterChips>

      {catalogos.data ? (
        <FiltrosObservacoes
          // Recriado quando a URL muda (ex.: "Limpar" ou navegação), descartando o rascunho anterior.
          key={JSON.stringify(search)}
          search={search}
          catalogos={catalogos.data}
          onAplicar={(filtros) => buscar({ situacao: search.situacao, ...filtros })}
          onLimpar={filtrosAtivos ? () => buscar({ situacao: search.situacao }) : undefined}
        />
      ) : catalogos.isPending ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : (
        <Alert variant="danger">
          <AlertCircle aria-hidden />
          <p>Não foi possível carregar os filtros: {catalogos.error.message}</p>
        </Alert>
      )}

      <section aria-live="polite" className={cn('flex flex-col gap-3', observacoes.isFetching && 'opacity-70')}>
        {observacoes.isPending ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : observacoes.error ? (
          <EmptyState title="Não foi possível carregar as observações" description={observacoes.error.message} />
        ) : observacoes.data.length ? (
          <>
            <p className="text-[13px] text-ink-muted">
              {observacoes.data.length === 1 ? '1 observação' : `${observacoes.data.length.toLocaleString('pt-BR')} observações`}
            </p>
            {visiveis.map((o) => (
              <ListRow
                key={o.id}
                title={o.indicador.nome}
                subtitle={`${o.territorio.nome} · ${descreverRecorte(o)} · ${o.referencia.rotulo}`}
                meta={
                  <>
                    <span className="line-clamp-1 break-words">Fonte: {o.fonte.nome}</span>
                    {o.divulgacaoBloqueada ? <span className="text-danger">Motivo: {o.motivoBloqueio}</span> : null}
                  </>
                }
                aside={
                  <>
                    <span className="break-all text-lg font-bold tabular-nums text-ink">{valorExato(o)}</span>
                    <SituacaoObservacao observacao={o} />
                  </>
                }
                actions={
                  <>
                    <Button asChild variant="secondary" size="sm" className="flex-1 sm:flex-none">
                      <Link to="/admin/observacoes/$observacaoId" params={{ observacaoId: o.id }}>
                        Abrir
                      </Link>
                    </Button>
                    {o.status === 'rascunho' && !o.divulgacaoBloqueada ? (
                      <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setConfirmando(o)}>
                        Publicar
                      </Button>
                    ) : null}
                  </>
                }
              />
            ))}
            {observacoes.data.length > quantidade ? (
              <Button variant="secondary" className="self-center" onClick={() => setQuantidade((atual) => atual + POR_PAGINA)}>
                Mostrar mais ({(observacoes.data.length - quantidade).toLocaleString('pt-BR')} restantes)
              </Button>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="Nenhuma observação para estes filtros"
            description={filtrosAtivos || search.situacao ? 'Altere ou limpe os filtros para ver outras observações.' : undefined}
            action={
              <Button asChild variant="secondary">
                <Link to="/admin/observacoes/nova">Cadastrar observação</Link>
              </Button>
            }
          />
        )}
      </section>

      <DialogoPublicar observacao={confirmando} onFechar={() => setConfirmando(null)} onPublicada={setPublicada} />
    </AdminContainer>
  )
}

const TODOS = 'todos'
type Filtros = Omit<ObservacoesSearch, 'situacao'>

/** Rascunho local dos filtros; a consulta só muda ao aplicar. */
function FiltrosObservacoes({
  search,
  catalogos,
  onAplicar,
  onLimpar,
}: {
  search: ObservacoesSearch
  catalogos: Catalogos
  onAplicar: (filtros: Filtros) => void
  onLimpar?: () => void
}) {
  const [rascunho, setRascunho] = React.useState<Filtros>({
    tema: search.tema,
    indicador: search.indicador,
    territorio: search.territorio,
    referencia: search.referencia,
    ano: search.ano,
  })
  const [ano, setAno] = React.useState(search.ano ? String(search.ano) : '')
  const [erroAno, setErroAno] = React.useState<string>()

  const selecionar = (campo: 'tema' | 'indicador' | 'territorio') => (valor: string) =>
    setRascunho((atual) => ({ ...atual, [campo]: valor === TODOS ? undefined : valor }))

  function aplicar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const lido = ano.trim() ? lerAno(ano) : undefined
    if (lido === null) {
      setErroAno(ANO_INVALIDO)
      return
    }
    onAplicar({ ...rascunho, ano: lido })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form noValidate onSubmit={aplicar} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectFiltro id="filtro-tema" label="Tema" valor={rascunho.tema} itens={catalogos.temas} onChange={selecionar('tema')} />
            <SelectFiltro
              id="filtro-indicador"
              label="Indicador"
              valor={rascunho.indicador}
              itens={catalogos.indicadores}
              onChange={selecionar('indicador')}
            />
            <SelectFiltro
              id="filtro-territorio"
              label="Território"
              valor={rascunho.territorio}
              itens={catalogos.territorios}
              onChange={selecionar('territorio')}
            />
            <SelectFiltro
              id="filtro-referencia"
              label="Tipo de referência"
              valor={rascunho.referencia}
              itens={TIPOS_REFERENCIA.map((item) => ({ codigo: item.tipo, nome: item.rotulo }))}
              onChange={(valor) =>
                setRascunho((atual) => ({ ...atual, referencia: valor === TODOS ? undefined : (valor as Filtros['referencia']) }))
              }
            />
            <FormField
              label="Ano"
              labelVariant="field"
              htmlFor="filtro-ano"
              error={erroAno}
              hint="Referências de um único ano; acumulados ficam de fora."
            >
              <Input
                id="filtro-ano"
                inputMode="numeric"
                maxLength={4}
                placeholder="AAAA"
                value={ano}
                onChange={(event) => {
                  setAno(event.target.value)
                  setErroAno(undefined)
                }}
                aria-invalid={!!erroAno}
                aria-describedby="filtro-ano-message"
              />
            </FormField>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            {onLimpar ? (
              <Button type="button" variant="ghost" onClick={onLimpar}>
                Limpar filtros
              </Button>
            ) : null}
            <Button type="submit" variant="secondary">
              Aplicar filtros
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function SelectFiltro({
  id,
  label,
  valor,
  itens,
  onChange,
}: {
  id: string
  label: string
  valor: string | undefined
  itens: { codigo: string; nome: string }[]
  onChange: (valor: string) => void
}) {
  return (
    <FormField label={label} labelVariant="field" htmlFor={id}>
      <Select value={valor ?? TODOS} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)]">
          <SelectItem value={TODOS}>Todos</SelectItem>
          {itens.map((item) => (
            <SelectItem key={item.codigo} value={item.codigo} className="whitespace-normal">
              {item.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}
