import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ColumnChart } from '@/components/charts/column-chart'
import { HorizontalBars } from '@/components/charts/horizontal-bars'
import { PublicContainer } from '@/components/layout/public-layout'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
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
import { fontesDe, serieDoTipo, temDemonstracao, ultimosPorCnae } from '@/lib/indicadores'
import { formatPeriodo, mesCurto } from '@/lib/periodo'
import type { DashboardSearch } from '@/lib/schemas'
import type { Indicador, TipoIndicador } from '@/models'
import { useCnaes, useIndicadores, usePeriodos, useTiposIndicadores } from '@/queries/consulta.queries'
import { AvisoFiltroCnae, SetorSelect } from './filtros-publicos'

const KPIS: { municipal: string; porCnae?: string; color: StatCardProps['color'] }[] = [
  { municipal: 'empresas_ativas', porCnae: 'empresas_por_setor', color: 'sky' },
  { municipal: 'numero_leitos', color: 'cyan' },
  { municipal: 'empregos_formais', porCnae: 'empregos_por_setor', color: 'lilac' },
  { municipal: 'ocupacao_media_hoteis', color: 'yellow' },
]
const TIPO_OCUPACAO = 'ocupacao_media_hoteis'
const TIPO_EMPRESAS_SETOR = 'empresas_por_setor'

export function DashboardPage({ search }: { search: DashboardSearch }) {
  const navigate = useNavigate({ from: '/' })
  const periodos = usePeriodos()
  const cnaes = useCnaes()
  const tipos = useTiposIndicadores()

  const anos = React.useMemo(
    () => [...new Set((periodos.data ?? []).filter((p) => p.mes !== null).map((p) => p.ano))],
    [periodos.data],
  )
  const ano = search.ano ?? anos[0]
  const intervalo = ano ? { inicio: `${ano}-01`, fim: `${ano}-12`, periodicidade: 'mensal' as const } : undefined

  const municipais = useIndicadores({ ...intervalo, escopo: 'municipal' }, !!intervalo)
  const porCnae = useIndicadores({ ...intervalo, escopo: 'cnae' }, !!intervalo)

  const [rascunho, setRascunho] = React.useState({ ano, cnae: search.cnae })
  React.useEffect(() => setRascunho({ ano, cnae: search.cnae }), [ano, search.cnae])

  const mesesDoAno = (periodos.data ?? []).filter((p) => p.ano === ano && p.mes !== null).map((p) => p.mes!)
  const rotuloPeriodo = ano && mesesDoAno.length
    ? `${mesCurto(Math.min(...mesesDoAno))} — ${mesCurto(Math.max(...mesesDoAno))} ${ano}`
    : 'Sem períodos publicados'
  const ultimoPeriodo = periodos.data?.[0]

  const carregando = periodos.isPending || (!!intervalo && (municipais.isPending || porCnae.isPending))
  const erro = periodos.error ?? municipais.error ?? porCnae.error

  return (
    <PublicContainer className="gap-7 md:py-8">
      <section className="flex flex-col gap-6 rounded-2xl bg-brand-gradient px-6 py-8 text-white md:flex-row md:items-end md:justify-between md:px-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="eyebrow text-on-brand-muted">Dados do turismo local</p>
          <h1 className="text-[28px] font-bold leading-tight md:text-[34px]">Entenda Santa Rita do Sapucaí por meio dos dados.</h1>
          <p className="text-sm text-on-brand">
            Indicadores atualizados de hospedagem, empresas, empregos e fluxo de visitantes.
          </p>
        </div>
        <Button asChild variant="secondary" className="shrink-0 border-transparent">
          <Link to="/indicadores" search={{ tema: 'visao-geral' }}>Ver todos os indicadores</Link>
        </Button>
      </section>

      <form
        className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          void navigate({ search: { ano: rascunho.ano, cnae: rascunho.cnae } })
        }}
      >
        <FormField label="Período" htmlFor="periodo" className="w-full sm:w-60">
          <Select
            value={rascunho.ano ? String(rascunho.ano) : undefined}
            onValueChange={(value) => setRascunho((r) => ({ ...r, ano: Number(value) }))}
            disabled={!anos.length}
          >
            <SelectTrigger id="periodo">
              <SelectValue placeholder={rotuloPeriodo} />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a === ano ? rotuloPeriodo : `Jan — Dez ${a}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <SetorSelect cnaes={cnaes.data} value={rascunho.cnae} onChange={(cnae) => setRascunho((r) => ({ ...r, cnae }))} />
        <Button type="submit" variant="gradient">
          Aplicar filtros
        </Button>
        {ultimoPeriodo ? (
          <p className="text-[13px] text-ink-muted sm:ml-auto sm:self-center">
            Última atualização: {formatPeriodo(ultimoPeriodo, 'longo').toLowerCase()}
          </p>
        ) : null}
      </form>

      <AvisoFiltroCnae ativo={!!search.cnae} />

      {erro ? (
        <EmptyState title="Não foi possível carregar os indicadores" description={erro.message} />
      ) : carregando ? (
        <DashboardSkeleton />
      ) : (
        <>
          <Kpis tipos={tipos.data ?? []} municipais={municipais.data ?? []} porCnae={porCnae.data ?? []} cnae={search.cnae} />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <OcupacaoMensal indicadores={municipais.data ?? []} ano={ano} />
            <EmpresasPorSegmento indicadores={porCnae.data ?? []} cnae={search.cnae} />
          </div>
        </>
      )}
    </PublicContainer>
  )
}

function Kpis({
  tipos,
  municipais,
  porCnae,
  cnae,
}: {
  tipos: TipoIndicador[]
  municipais: Indicador[]
  porCnae: Indicador[]
  cnae?: string
}) {
  const cards = KPIS.flatMap((kpi) => {
    const codigo = cnae && kpi.porCnae ? kpi.porCnae : kpi.municipal
    const tipo = tipos.find((t) => t.codigo === codigo)
    if (!tipo) return []
    const serie = cnae && kpi.porCnae ? serieDoTipo(porCnae, codigo, cnae) : serieDoTipo(municipais, codigo)
    return [{ kpi, tipo, serie }]
  })
  const exibidos = cards.flatMap((c) => c.serie)

  return (
    <section aria-label="Indicadores principais" className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ kpi, tipo, serie }) => {
          const atual = serie.at(-1)
          const primeiro = serie[0]
          const variacao = atual && primeiro && serie.length > 1 ? formatVariacao(atual.valor, primeiro.valor, tipo.unidade) : null
          const tom = !atual || !primeiro || atual.valor === primeiro.valor ? 'neutral' : atual.valor > primeiro.valor ? 'positive' : 'negative'
          return (
            <StatCard
              key={tipo.codigo}
              color={kpi.color}
              label={cnae && kpi.porCnae && atual?.nomeCnae ? `${tipo.nome} — ${atual.nomeCnae}` : tipo.nome}
              value={atual ? formatValorIndicador(atual.valor, tipo.unidade) : '—'}
              tone={variacao ? tom : 'neutral'}
              helper={
                !atual
                  ? 'Sem dados para o período'
                  : variacao
                    ? `${variacao} no período · ${formatPeriodo(atual.periodo)}`
                    : `Referência: ${formatPeriodo(atual.periodo)}`
              }
              title={atual ? `Fonte: ${atual.fonte}` : undefined}
            />
          )
        })}
      </div>
      <SourceNote fontes={fontesDe(exibidos)} demonstracao={temDemonstracao(exibidos)} />
    </section>
  )
}

function OcupacaoMensal({ indicadores, ano }: { indicadores: Indicador[]; ano?: number }) {
  const serie = serieDoTipo(indicadores, TIPO_OCUPACAO)
  const data = serie.map((i) => ({
    label: mesCurto(i.periodo.mes!),
    valor: i.valor,
    rotulo: formatValorIndicador(i.valor, 'percentual'),
    detalhe: `${formatPeriodo(i.periodo)}${i.demonstracao ? ' · dado fictício' : ''}`,
  }))
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">Ocupação hoteleira por mês</CardTitle>
        <CardDescription>Percentual médio informado em cada mês{ano ? ` de ${ano}` : ''}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {data.length ? (
          <ColumnChart data={data} ariaLabel={`Ocupação hoteleira mensal em ${ano}`} />
        ) : (
          <EmptyState className="min-h-56" />
        )}
        <SourceNote fontes={fontesDe(serie)} demonstracao={temDemonstracao(serie)} />
      </CardContent>
    </Card>
  )
}

function EmpresasPorSegmento({ indicadores, cnae }: { indicadores: Indicador[]; cnae?: string }) {
  const ultimos = ultimosPorCnae(indicadores, TIPO_EMPRESAS_SETOR)
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">Empresas por segmento</CardTitle>
        <CardDescription>Último valor publicado de cada CNAE</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {ultimos.length ? (
          <HorizontalBars
            data={ultimos.map((i) => ({
              key: i.codigoCnae!,
              label: i.nomeCnae ?? i.codigoCnae!,
              valor: i.valor,
              rotulo: formatValorIndicador(i.valor, i.unidade),
              destaque: i.codigoCnae === cnae,
              title: `${i.codigoCnae} · ${formatPeriodo(i.periodo)}`,
            }))}
          />
        ) : (
          <EmptyState className="min-h-56" />
        )}
        <SourceNote fontes={fontesDe(ultimos)} demonstracao={temDemonstracao(ultimos)} />
      </CardContent>
    </Card>
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
