import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ColumnChart } from '@/components/charts/column-chart'
import { HorizontalBars } from '@/components/charts/horizontal-bars'
import { PublicContainer, PublicPageHeader } from '@/components/layout/public-layout'
import {
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
} from '@/components/ui'
import { formatValorIndicador } from '@/lib/format'
import { fechamentoAnual, fontesDe, serieDoTipo, temDemonstracao, ultimosPorCnae } from '@/lib/indicadores'
import { formatPeriodo, mesCurto } from '@/lib/periodo'
import { temasIndicadores, type IndicadoresSearch, type TemaIndicador } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import type { Cnae, Indicador, Rota, TipoIndicador } from '@/models'
import { useCnaes, useIndicadores, usePeriodos, useRotas, useTiposIndicadores } from '@/queries/consulta.queries'
import { AvisoFiltroCnae, SetorSelect } from './filtros-publicos'
import { RESUMO, TEMAS } from './temas'

export function IndicadoresPage({ search }: { search: IndicadoresSearch }) {
  const navigate = useNavigate({ from: '/indicadores' })
  const periodos = usePeriodos()
  const tipos = useTiposIndicadores()
  const cnaes = useCnaes()
  const rotas = useRotas()
  const indicadores = useIndicadores({})

  const anos = React.useMemo(() => [...new Set((periodos.data ?? []).map((p) => p.ano))].sort((a, b) => b - a), [periodos.data])
  const ate = search.ate ?? anos[0]
  const de = search.de ?? anos.at(-1)

  const [rascunho, setRascunho] = React.useState({ de, cnae: search.cnae })
  React.useEffect(() => setRascunho({ de, cnae: search.cnae }), [de, search.cnae])

  const noIntervalo = React.useMemo(
    () => (indicadores.data ?? []).filter((i) => (!de || i.periodo.ano >= de) && (!ate || i.periodo.ano <= ate)),
    [indicadores.data, de, ate],
  )
  const tema = TEMAS[search.tema]
  const catalogo = tipos.data ?? []
  const carregando = periodos.isPending || tipos.isPending || indicadores.isPending
  const erro = periodos.error ?? tipos.error ?? indicadores.error

  return (
    <PublicContainer>
      <PublicPageHeader
        eyebrow="Indicadores turísticos"
        title="Indicadores do turismo"
        description="Explore os dados por tema, período e setor. Compare séries históricas e identifique tendências."
      />

      <div className="flex flex-col gap-5">
        <form
          className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            void navigate({ search: (prev) => ({ ...prev, de: rascunho.de, ate, cnae: rascunho.cnae }) })
          }}
        >
          <FormField label="Período" htmlFor="periodo" className="w-full sm:w-60">
            <Select
              value={rascunho.de ? String(rascunho.de) : undefined}
              onValueChange={(value) => setRascunho((r) => ({ ...r, de: Number(value) }))}
              disabled={!anos.length}
            >
              <SelectTrigger id="periodo">
                <SelectValue placeholder="Sem períodos publicados" />
              </SelectTrigger>
              <SelectContent>
                {anos.map((ano) => (
                  <SelectItem key={ano} value={String(ano)}>
                    {ano === ate ? String(ano) : `${ano} — ${ate}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <SetorSelect cnaes={cnaes.data} value={rascunho.cnae} onChange={(cnae) => setRascunho((r) => ({ ...r, cnae }))} />
          <Button type="submit" variant="gradient">
            Aplicar filtros
          </Button>
        </form>

        <FilterChips
          aria-label="Tema"
          value={search.tema}
          onValueChange={(value) => void navigate({ search: (prev) => ({ ...prev, tema: value as TemaIndicador }) })}
        >
          {temasIndicadores.map((t) => (
            <FilterChip key={t} value={t}>
              {TEMAS[t].label}
            </FilterChip>
          ))}
        </FilterChips>
        <AvisoFiltroCnae ativo={!!search.cnae} />
      </div>

      {erro ? (
        <EmptyState title="Não foi possível carregar os indicadores" description={erro.message} />
      ) : carregando ? (
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : tema.series.length === 0 && !tema.comparativo ? (
        <EmptyState
          title="Sem dados publicados para este tema"
          description="Os indicadores de fluxo de visitantes ainda não fazem parte da base do Observatório."
        />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <SerieHistorica
              key={search.tema}
              tipos={tema.series.map((codigo) => catalogo.find((t) => t.codigo === codigo)).filter((t) => !!t)}
              indicadores={noIntervalo}
              multiAno={!!de && !!ate && de !== ate}
            />
            <ResumoPeriodo tipos={catalogo} indicadores={noIntervalo} />
          </div>
          {tema.comparativo ? (
            <Comparativo
              tipo={catalogo.find((t) => t.codigo === tema.comparativo)}
              indicadores={noIntervalo}
              cnae={search.cnae}
            />
          ) : null}
        </>
      )}

      {search.tema === 'visao-geral' && !carregando && !erro ? (
        <TodosIndicadores tipos={catalogo} indicadores={noIntervalo} cnaes={cnaes.data ?? []} cnae={search.cnae} />
      ) : null}

      <Rotas rotas={rotas.data} cnaes={cnaes.data ?? []} carregando={rotas.isPending} />
    </PublicContainer>
  )
}

function SerieHistorica({ tipos, indicadores, multiAno }: { tipos: TipoIndicador[]; indicadores: Indicador[]; multiAno: boolean }) {
  const [codigo, setCodigo] = React.useState(tipos[0]?.codigo)
  const tipo = tipos.find((t) => t.codigo === codigo) ?? tipos[0]
  if (!tipo) return <EmptyState title="Sem série histórica para este tema" className="min-h-72" />

  const serie = serieDoTipo(indicadores, tipo.codigo)
  const pontos = multiAno ? fechamentoAnual(serie) : serie
  const data = pontos.map((i) => ({
    label: multiAno || i.periodo.mes == null ? String(i.periodo.ano) : mesCurto(i.periodo.mes),
    valor: i.valor,
    rotulo: formatValorIndicador(i.valor, i.unidade),
    detalhe: `${formatPeriodo(i.periodo)}${i.demonstracao ? ' · dado fictício' : ''}`,
  }))

  return (
    <Card className="shadow-card">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Série histórica — {tipo.nome.toLowerCase()}</CardTitle>
          <CardDescription>
            {multiAno ? 'Evolução anual (último valor publicado de cada ano, sem somar meses)' : 'Evolução mensal no período'}
          </CardDescription>
        </div>
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
        {data.length ? <ColumnChart data={data} ariaLabel={`Série histórica de ${tipo.nome}`} /> : <EmptyState className="min-h-56" />}
        <SourceNote fontes={fontesDe(pontos)} demonstracao={temDemonstracao(pontos)} />
      </CardContent>
    </Card>
  )
}

function ResumoPeriodo({ tipos, indicadores }: { tipos: TipoIndicador[]; indicadores: Indicador[] }) {
  const linhas = RESUMO.flatMap(({ tipo: codigo, cor }) => {
    const tipo = tipos.find((t) => t.codigo === codigo)
    return tipo ? [{ tipo, cor, atual: serieDoTipo(indicadores, codigo).at(-1) }] : []
  })
  const exibidos = linhas.flatMap((l) => (l.atual ? [l.atual] : []))
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">Resumo do período</CardTitle>
        <CardDescription>Último valor publicado no intervalo</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ul className="flex flex-col gap-5">
          {linhas.map(({ tipo, cor, atual }) => (
            <li key={tipo.codigo} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-3 text-[13px] text-ink-muted">
                <span aria-hidden className={cn('size-2.5 rounded-full', cor)} />
                {tipo.nome}
              </span>
              {atual ? (
                <span className="text-right">
                  <span className="block text-lg font-bold tabular-nums text-ink">{formatValorIndicador(atual.valor, tipo.unidade)}</span>
                  <span className="block text-[11px] text-ink-subtle">{formatPeriodo(atual.periodo)}</span>
                </span>
              ) : (
                <span className="text-xs text-ink-subtle">Sem dados para o período</span>
              )}
            </li>
          ))}
        </ul>
        <SourceNote fontes={fontesDe(exibidos)} demonstracao={temDemonstracao(exibidos)} />
      </CardContent>
    </Card>
  )
}

function Comparativo({ tipo, indicadores, cnae }: { tipo?: TipoIndicador; indicadores: Indicador[]; cnae?: string }) {
  if (!tipo) return null
  const ultimos = ultimosPorCnae(indicadores, tipo.codigo)
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">Comparativo por segmento — {tipo.nome.toLowerCase()}</CardTitle>
        <CardDescription>Último valor publicado de cada CNAE no período</CardDescription>
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
          <EmptyState />
        )}
        <SourceNote fontes={fontesDe(ultimos)} demonstracao={temDemonstracao(ultimos)} />
      </CardContent>
    </Card>
  )
}

function TodosIndicadores({
  tipos,
  indicadores,
  cnaes,
  cnae,
}: {
  tipos: TipoIndicador[]
  indicadores: Indicador[]
  cnaes: Cnae[]
  cnae?: string
}) {
  const nomeCnae = cnaes.find((c) => c.codigo === cnae)?.nome
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Todos os indicadores</CardTitle>
        <CardDescription>
          Indicadores por setor mostram {nomeCnae ? `o recorte "${nomeCnae}"` : 'quantos segmentos têm dados — selecione um setor para ver o valor'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="text-xs text-ink-muted">
            <tr className="border-b border-line">
              <th className="py-2 pr-4 font-medium">Indicador</th>
              <th className="py-2 pr-4 font-medium">Valor</th>
              <th className="py-2 pr-4 font-medium">Período</th>
              <th className="py-2 font-medium">Fonte</th>
            </tr>
          </thead>
          <tbody>
            {tipos.map((tipo) => {
              const porSetor = tipo.escopo === 'cnae'
              const atual = porSetor
                ? cnae
                  ? serieDoTipo(indicadores, tipo.codigo, cnae).at(-1)
                  : undefined
                : serieDoTipo(indicadores, tipo.codigo).at(-1)
              const segmentos = porSetor && !cnae ? ultimosPorCnae(indicadores, tipo.codigo).length : 0
              return (
                <tr key={tipo.codigo} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-ink">{tipo.nome}</p>
                    <p className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-ink-subtle">
                      {porSetor ? 'Por setor (CNAE)' : 'Total municipal'}
                      {tipo.provisorio ? <Badge variant="neutral" className="h-5 px-2 text-[10px]">Conceito provisório</Badge> : null}
                    </p>
                  </td>
                  <td className="py-3 pr-4 font-semibold tabular-nums text-ink">
                    {atual ? (
                      <span className="flex items-center gap-2">
                        {formatValorIndicador(atual.valor, tipo.unidade)}
                        {atual.demonstracao ? <DemoBadge /> : null}
                      </span>
                    ) : porSetor && !cnae ? (
                      <span className="font-normal text-ink-muted">{segmentos ? `${segmentos} segmento(s) com dados` : 'Sem dados para o período'}</span>
                    ) : (
                      <span className="font-normal text-ink-muted">Sem dados para o período</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-ink-muted">{atual ? formatPeriodo(atual.periodo) : '—'}</td>
                  <td className="py-3 text-xs text-ink-muted">{atual?.fonte ?? tipo.fonteReferencia ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function Rotas({ rotas, cnaes, carregando }: { rotas?: Rota[]; cnaes: Cnae[]; carregando: boolean }) {
  if (carregando) return <Skeleton className="h-40 rounded-2xl" />
  if (!rotas?.length) return null
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-ink">Rotas turísticas</h2>
        <p className="mt-1 text-sm text-ink-muted">Agrupamentos de setores usados pelo Observatório.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rotas.map((rota) => (
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
                  {rota.cnaes.map((codigo) => (
                    <li key={codigo}>
                      <Badge variant="info">{cnaes.find((c) => c.codigo === codigo)?.nome ?? codigo}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
