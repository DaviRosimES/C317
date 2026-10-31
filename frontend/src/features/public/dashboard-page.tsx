import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ColumnChart } from '@/components/charts/column-chart'
import { HorizontalBars } from '@/components/charts/horizontal-bars'
import { PublicContainer } from '@/components/layout/public-layout'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DemoBadge,
  EmptyState,
  FilterChip,
  FilterChips,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  SourceNote,
  StatCard,
  type StatCardProps,
} from '@/components/ui'
import { formatValorIndicador, formatVariacao } from '@/lib/format'
import { fontesDe, referenciaDaSerie, serieDoTipo, temDemonstracao, valoresPorCnae } from '@/lib/indicadores'
import { comparePeriodo, formatPeriodo, mesCurto, mesLongo } from '@/lib/periodo'
import type { DashboardSearch } from '@/lib/schemas'
import type { Cnae, Indicador, Periodo, Rota, TipoIndicador } from '@/models'
import { useCnaes, useIndicadores, usePeriodos, useRotas, useTiposIndicadores } from '@/queries/consulta.queries'
import { AvisoFiltroCnae, LimparFiltros, SetorSelect } from './filtros-publicos'

const CORES: NonNullable<StatCardProps['color']>[] = ['sky', 'cyan', 'lilac', 'yellow', 'purple', 'magenta', 'blue']
const TODOS = 'todos'

const tiposComValores = (tipos: TipoIndicador[], indicadores: Indicador[], escopo: 'municipal' | 'cnae') =>
  tipos.filter((t) => t.escopo === escopo && indicadores.some((i) => i.tipo === t.codigo))

export function DashboardPage({ search }: { search: DashboardSearch }) {
  const navigate = useNavigate({ from: '/' })
  const periodos = usePeriodos()
  const cnaes = useCnaes()
  const tipos = useTiposIndicadores()

  const anos = React.useMemo(() => [...new Set((periodos.data ?? []).map((p) => p.ano))].sort((a, b) => b - a), [periodos.data])
  const ano = search.ano ?? anos[0]
  const mensais = useIndicadores({ ano, periodicidade: 'mensal' }, !!ano)
  const anuais = useIndicadores({ ano, periodicidade: 'anual' }, !!ano)

  const [rascunho, setRascunho] = React.useState<DashboardSearch>({ ano, mes: search.mes, cnae: search.cnae })
  React.useEffect(() => setRascunho({ ano, mes: search.mes, cnae: search.cnae }), [ano, search.mes, search.cnae])
  const mesesDisponiveis = (periodos.data ?? [])
    .filter((p) => p.ano === rascunho.ano && p.mes !== null)
    .map((p) => p.mes!)
    .sort((a, b) => a - b)

  const cnae = cnaes.data?.find((c) => c.codigo === search.cnae)
  const incompativeis = (tipos.data ?? []).filter((t) => t.escopo === 'desconhecido')
  const carregando = periodos.isPending || tipos.isPending || (!!ano && (mensais.isPending || anuais.isPending))
  const erro = periodos.error ?? tipos.error ?? mensais.error ?? anuais.error
  const temFiltro = !!(search.ano || search.mes || search.cnae)

  return (
    <PublicContainer className="gap-7 md:py-8">
      <section className="flex flex-col gap-6 rounded-2xl bg-brand-gradient px-6 py-8 text-white md:flex-row md:items-end md:justify-between md:px-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="eyebrow text-on-brand-muted">Dados do turismo local</p>
          <h1 className="text-[28px] font-bold leading-tight md:text-[34px]">Entenda Santa Rita do Sapucaí por meio dos dados.</h1>
          <p className="text-sm text-on-brand">Indicadores de hospedagem, empresas e empregos por período e setor.</p>
        </div>
        <Button asChild variant="secondary" className="shrink-0 border-transparent">
          <Link to="/indicadores">Ver todos os indicadores</Link>
        </Button>
      </section>

      <form
        className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          void navigate({ search: rascunho })
        }}
      >
        <FormField label="Ano" htmlFor="ano" className="w-full sm:w-40">
          <Select
            value={rascunho.ano ? String(rascunho.ano) : undefined}
            onValueChange={(valor) => setRascunho((r) => ({ ...r, ano: Number(valor), mes: undefined }))}
            disabled={!anos.length}
          >
            <SelectTrigger id="ano">
              <SelectValue placeholder="Sem períodos publicados" />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Mês" htmlFor="mes" className="w-full sm:w-48">
          <Select
            value={rascunho.mes ? String(rascunho.mes) : TODOS}
            onValueChange={(valor) => setRascunho((r) => ({ ...r, mes: valor === TODOS ? undefined : Number(valor) }))}
            disabled={!mesesDisponiveis.length}
          >
            <SelectTrigger id="mes">
              <SelectValue placeholder="Sem valores mensais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os meses</SelectItem>
              {mesesDisponiveis.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {mesLongo(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <SetorSelect cnaes={cnaes.data} value={rascunho.cnae} onChange={(valor) => setRascunho((r) => ({ ...r, cnae: valor }))} />
        <div className="flex gap-2">
          <Button type="submit" variant="gradient">
            Aplicar filtros
          </Button>
          <LimparFiltros desabilitado={!temFiltro} onClick={() => void navigate({ search: {} })} />
        </div>
        <ReferenciasRecentes periodos={periodos.data} />
      </form>

      <AvisoFiltroCnae ativo={!!search.cnae} />
      {incompativeis.length ? (
        <Alert variant="warning">
          Indicador com escopo não reconhecido ({incompativeis.map((t) => `${t.nome}: ${t.escopoOriginal}`).join('; ')}). Ele não é
          exibido para não ser confundido com um total municipal.
        </Alert>
      ) : null}

      {erro ? (
        <EmptyState title="Não foi possível carregar os indicadores" description={erro.message} />
      ) : carregando ? (
        <DashboardSkeleton />
      ) : !ano || (!mensais.data?.length && !anuais.data?.length) ? (
        <EmptyState
          title={ano ? `Nenhum valor publicado em ${ano}` : 'Nenhum valor publicado'}
          description="Ausência de dado não é zero."
          action={temFiltro ? <LimparFiltros onClick={() => void navigate({ search: {} })} /> : undefined}
        />
      ) : (
        <>
          <SecaoMensal
            ano={ano}
            mes={search.mes}
            cnae={cnae}
            codigoCnae={search.cnae}
            tipos={tipos.data ?? []}
            indicadores={mensais.data ?? []}
          />
          <SecaoAnual ano={ano} cnae={cnae} codigoCnae={search.cnae} tipos={tipos.data ?? []} indicadores={anuais.data ?? []} />
        </>
      )}

      <Rotas cnaes={cnaes.data ?? []} />
    </PublicContainer>
  )
}

function ReferenciasRecentes({ periodos }: { periodos?: Periodo[] }) {
  const ordenados = [...(periodos ?? [])].sort(comparePeriodo)
  const mensal = ordenados.filter((p) => p.mes !== null).at(-1)
  const anual = ordenados.filter((p) => p.mes === null).at(-1)
  if (!mensal && !anual) return null
  return (
    <p className="text-[13px] text-ink-muted sm:ml-auto sm:self-center">
      Referências mais recentes publicadas: {[mensal ? `${formatPeriodo(mensal, 'longo').toLowerCase()} (mensal)` : null, anual ? formatPeriodo(anual, 'longo').toLowerCase() : null].filter(Boolean).join(' · ')}
    </p>
  )
}

interface CardIndicador {
  tipo: TipoIndicador
  serie: Indicador[]
  escopo: 'municipal' | 'cnae'
}

function MetaIndicador({ indicador, escopo, cnae }: { indicador?: Indicador; escopo: 'municipal' | 'cnae'; cnae?: Cnae }) {
  return (
    <>
      <span>{escopo === 'municipal' ? 'Total municipal' : `Setor: ${cnae?.nome ?? '—'} (${cnae?.codigo ?? '—'})`}</span>
      {indicador ? (
        <>
          <span>Referência: {formatPeriodo(indicador.periodo, 'longo').toLowerCase()}</span>
          <span>Fonte: {indicador.fonte}</span>
          {indicador.demonstracao ? <DemoBadge className="self-start" /> : null}
        </>
      ) : null}
    </>
  )
}

function SecaoMensal({
  ano,
  mes,
  cnae,
  codigoCnae,
  tipos,
  indicadores,
}: {
  ano: number
  mes?: number
  cnae?: Cnae
  codigoCnae?: string
  tipos: TipoIndicador[]
  indicadores: Indicador[]
}) {
  const municipais = tiposComValores(tipos, indicadores, 'municipal')
  const setoriais = tiposComValores(tipos, indicadores, 'cnae')
  const cards: CardIndicador[] = [
    ...municipais.map((tipo) => ({ tipo, serie: serieDoTipo(indicadores, tipo.codigo), escopo: 'municipal' as const })),
    ...(codigoCnae
      ? setoriais.map((tipo) => ({ tipo, serie: serieDoTipo(indicadores, tipo.codigo, codigoCnae), escopo: 'cnae' as const }))
      : []),
  ]
  const referencia = mes ? `${mesLongo(mes).toLowerCase()} de ${ano}` : `${ano}, último mês publicado`
  const setorSemDados = !!codigoCnae && cards.filter((c) => c.escopo === 'cnae').every((c) => !referenciaDaSerie(c.serie, mes).atual)

  if (!indicadores.length) {
    return <EmptyState title={`Sem valores mensais publicados em ${ano}`} description="Os valores anuais do ano aparecem abaixo." />
  }

  return (
    <section aria-labelledby="mensal" className="flex flex-col gap-5">
      <div>
        <h2 id="mensal" className="text-xl font-bold text-ink">
          Referência mensal
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">Valores de {referencia}. Estoques não são somados entre meses.</p>
      </div>
      {setorSemDados ? (
        <Alert variant="warning">
          Nenhum valor do setor {cnae?.nome ?? codigoCnae} em {referencia}. Os totais municipais seguem abaixo e não representam o
          setor.
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ tipo, serie, escopo }, index) => {
          const { atual, anterior } = referenciaDaSerie(serie, mes)
          const variacao = atual && anterior ? formatVariacao(atual.valor, anterior.valor, tipo.unidade) : null
          const tom = !variacao || !atual || !anterior || atual.valor === anterior.valor ? 'neutral' : atual.valor > anterior.valor ? 'positive' : 'negative'
          return (
            <StatCard
              key={`${escopo}-${tipo.codigo}`}
              color={CORES[index % CORES.length]}
              label={tipo.nome}
              value={atual ? formatValorIndicador(atual.valor, tipo.unidade, tipo.unidadeOriginal) : '—'}
              tone={tom}
              helper={
                !atual
                  ? 'Sem dados para o período'
                  : variacao && anterior
                    ? `${variacao} em relação a ${formatPeriodo(anterior.periodo).toLowerCase()}`
                    : undefined
              }
              meta={<MetaIndicador indicador={atual} escopo={escopo} cnae={cnae} />}
            />
          )
        })}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SerieMensal ano={ano} mes={mes} tipos={municipais} indicadores={indicadores} filtroSetor={!!codigoCnae} />
        <PorSetor mes={mes} tipos={setoriais} indicadores={indicadores} cnae={cnae} codigoCnae={codigoCnae} />
      </div>
    </section>
  )
}

function SerieMensal({
  ano,
  mes,
  tipos,
  indicadores,
  filtroSetor,
}: {
  ano: number
  mes?: number
  tipos: TipoIndicador[]
  indicadores: Indicador[]
  filtroSetor: boolean
}) {
  const inicial = tipos.find((t) => t.unidade === 'percentual') ?? tipos[0]
  const [codigo, setCodigo] = React.useState(inicial?.codigo)
  const tipo = tipos.find((t) => t.codigo === codigo) ?? inicial
  if (!tipo) return <EmptyState title="Sem totais municipais mensais" className="min-h-56" />
  const serie = serieDoTipo(indicadores, tipo.codigo)

  return (
    <Card className="shadow-card">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">{tipo.nome} por mês</CardTitle>
          <Badge variant="neutral">Total municipal</Badge>
        </div>
        <CardDescription>
          Valores mensais de {ano}
          {filtroSetor ? '; o filtro de setor não se aplica a este total' : ''}.
        </CardDescription>
        {tipos.length > 1 ? (
          <FilterChips aria-label="Indicador da série" value={tipo.codigo} onValueChange={setCodigo}>
            {tipos.map((t) => (
              <FilterChip key={t.codigo} value={t.codigo} className="h-8 text-xs">
                {t.nome}
              </FilterChip>
            ))}
          </FilterChips>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mes ? (
          <p className="rounded-lg bg-canvas px-4 py-6 text-center text-[13px] text-ink-muted">
            Referência de um único mês selecionada ({mesLongo(mes).toLowerCase()}). Escolha “Todos os meses” para ver a evolução
            do ano.
          </p>
        ) : serie.length ? (
          <ColumnChart
            ariaLabel={`${tipo.nome}, valores mensais de ${ano}`}
            data={serie.map((i) => ({
              label: mesCurto(i.periodo.mes!),
              valor: i.valor,
              rotulo: formatValorIndicador(i.valor, tipo.unidade, tipo.unidadeOriginal),
              detalhe: `${formatPeriodo(i.periodo)}${i.demonstracao ? ' · dado fictício' : ''}`,
            }))}
          />
        ) : (
          <EmptyState className="min-h-56" />
        )}
        <SourceNote fontes={fontesDe(serie)} demonstracao={temDemonstracao(serie)} />
      </CardContent>
    </Card>
  )
}

function PorSetor({
  mes,
  tipos,
  indicadores,
  cnae,
  codigoCnae,
}: {
  mes?: number
  tipos: TipoIndicador[]
  indicadores: Indicador[]
  cnae?: Cnae
  codigoCnae?: string
}) {
  const [codigo, setCodigo] = React.useState(tipos[0]?.codigo)
  const tipo = tipos.find((t) => t.codigo === codigo) ?? tipos[0]
  if (!tipo) return <EmptyState title="Sem valores por setor no período" className="min-h-56" />

  const doTipo = indicadores.filter((i) => i.tipo === tipo.codigo && i.codigoCnae)
  const ultimoMes = doTipo.reduce((maior, i) => Math.max(maior, i.periodo.mes ?? 0), 0)
  const referencia = doTipo.find((i) => i.periodo.mes === (mes ?? ultimoMes))?.periodo
  const valores = referencia
    ? valoresPorCnae(indicadores, tipo.codigo, referencia).filter((i) => !codigoCnae || i.codigoCnae === codigoCnae)
    : []

  return (
    <Card className="shadow-card">
      <CardHeader className="gap-3">
        <CardTitle className="text-lg">{tipo.nome}</CardTitle>
        <CardDescription>
          {codigoCnae ? `Somente ${cnae?.nome ?? codigoCnae}` : 'Um valor por CNAE; os setores não são somados'}
          {referencia ? ` · ${formatPeriodo(referencia, 'longo').toLowerCase()}` : ''}
        </CardDescription>
        {tipos.length > 1 ? (
          <FilterChips aria-label="Indicador por setor" value={tipo.codigo} onValueChange={setCodigo}>
            {tipos.map((t) => (
              <FilterChip key={t.codigo} value={t.codigo} className="h-8 text-xs">
                {t.nome}
              </FilterChip>
            ))}
          </FilterChips>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {valores.length ? (
          <HorizontalBars
            data={valores.map((i) => ({
              key: i.codigoCnae!,
              label: i.nomeCnae ?? i.codigoCnae!,
              valor: i.valor,
              rotulo: formatValorIndicador(i.valor, i.unidade, i.unidadeOriginal),
              title: `${i.codigoCnae} · ${formatPeriodo(i.periodo)}`,
            }))}
          />
        ) : (
          <EmptyState
            className="min-h-40"
            title={codigoCnae ? `Sem dados de ${cnae?.nome ?? codigoCnae} nesta referência` : 'Sem dados para o período'}
          />
        )}
        <SourceNote fontes={fontesDe(valores)} demonstracao={temDemonstracao(valores)} />
      </CardContent>
    </Card>
  )
}

function SecaoAnual({
  ano,
  cnae,
  codigoCnae,
  tipos,
  indicadores,
}: {
  ano: number
  cnae?: Cnae
  codigoCnae?: string
  tipos: TipoIndicador[]
  indicadores: Indicador[]
}) {
  const cards: CardIndicador[] = [
    ...tiposComValores(tipos, indicadores, 'municipal').map((tipo) => ({
      tipo,
      serie: serieDoTipo(indicadores, tipo.codigo),
      escopo: 'municipal' as const,
    })),
    ...(codigoCnae
      ? tiposComValores(tipos, indicadores, 'cnae').map((tipo) => ({
          tipo,
          serie: serieDoTipo(indicadores, tipo.codigo, codigoCnae),
          escopo: 'cnae' as const,
        }))
      : []),
  ]

  return (
    <section aria-labelledby="anual" className="flex flex-col gap-4">
      <div>
        <h2 id="anual" className="text-xl font-bold text-ink">
          Referência anual
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">Valores informados para o ano de {ano} inteiro, separados dos mensais.</p>
      </div>
      {cards.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ tipo, serie, escopo }, index) => {
            const atual = serie.at(-1)
            return (
              <StatCard
                key={`${escopo}-${tipo.codigo}`}
                color={CORES[(index + 3) % CORES.length]}
                label={tipo.nome}
                value={atual ? formatValorIndicador(atual.valor, tipo.unidade, tipo.unidadeOriginal) : '—'}
                tone="neutral"
                helper={atual ? undefined : 'Sem dados para o período'}
                meta={<MetaIndicador indicador={atual} escopo={escopo} cnae={cnae} />}
              />
            )
          })}
        </div>
      ) : (
        <EmptyState className="py-6" title={`Sem valores anuais publicados para ${ano}`} />
      )}
    </section>
  )
}

function Rotas({ cnaes }: { cnaes: Cnae[] }) {
  const rotas = useRotas()
  if (rotas.isPending) return <Skeleton className="h-40 rounded-2xl" />
  if (rotas.error) return <EmptyState title="Não foi possível carregar as rotas" description={rotas.error.message} />
  if (!rotas.data.length) return null
  return (
    <section aria-labelledby="rotas" className="flex flex-col gap-4">
      <div>
        <h2 id="rotas" className="text-xl font-bold text-ink">
          Rotas turísticas
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Agrupamentos de setores usados pelo Observatório.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rotas.data.map((rota: Rota) => (
          <Card key={rota.codigo}>
            <CardHeader>
              <CardTitle>{rota.nome}</CardTitle>
              <CardDescription>{rota.descricao}</CardDescription>
            </CardHeader>
            <CardContent>
              {rota.composicaoPendente ? (
                <Badge variant="warning">Classificação dos CNAEs por rota em definição</Badge>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {rota.cnaes.map((codigo) => {
                    const item = cnaes.find((c) => c.codigo === codigo)
                    return (
                      <li key={codigo}>
                        <Badge variant={item?.provisorio ? 'warning' : 'info'}>
                          {item?.nome ?? codigo}
                          {item?.provisorio ? ' · provisório' : ''}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  )
}
