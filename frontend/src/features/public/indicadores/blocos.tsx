import type { ReactNode } from 'react'
import { ColumnChart } from '@/components/charts/column-chart'
import { HorizontalBars } from '@/components/charts/horizontal-bars'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, DataTable, DemoBadge, SourceLinks } from '@/components/ui'
import { formatDecimal } from '@/lib/format'
import {
  foiArredondado,
  notasDe,
  rotuloCurto,
  rotuloRecorte,
  textoCurto,
  textoDoValor,
  valorNumerico,
  type Bloco,
} from '@/lib/consulta'
import { cn } from '@/lib/utils'
import type { DadoPublico, Fonte, Unidade } from '@/models'

type BlocoDe<T extends Bloco['tipo']> = Extract<Bloco, { tipo: T }>

export function FonteDoDado({ fonte, className }: { fonte: Fonte; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1 text-xs text-ink-muted', className)}>
      <p className="break-words">
        <span className="font-medium text-ink">Fonte:</span> {fonte.nome}
      </p>
      <SourceLinks links={fonte.links} />
    </div>
  )
}

export function Notas({ notas, titulo = 'Notas', className }: { notas: string[]; titulo?: string; className?: string }) {
  if (!notas.length) return null
  return (
    <div className={cn('rounded-lg bg-canvas px-3 py-2 text-xs text-ink-muted', className)}>
      <p className="font-medium text-ink">{titulo}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {notas.map((nota) => (
          <li key={nota}>{nota}</li>
        ))}
      </ul>
    </div>
  )
}

/** Valor exibido e, quando a exibição arredondou, o decimal recebido. */
function ValorNaTabela({ dado, unidade }: { dado: DadoPublico; unidade: Unidade }) {
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span>{textoDoValor(dado, unidade)}</span>
      {foiArredondado(dado, unidade) ? (
        <span className="text-[11px] font-normal text-ink-muted">valor recebido: {formatDecimal(dado.valor)}</span>
      ) : null}
    </span>
  )
}

/** Tabela equivalente a uma visualização: mesmos dados, sem depender do gráfico ou da cor. */
export function TabelaDosDados({
  dados,
  unidade,
  caption,
  colunas = ['referencia', 'recorte', 'valor', 'fonte', 'notas'],
  className,
}: {
  dados: DadoPublico[]
  unidade: Unidade
  caption: string
  colunas?: ('referencia' | 'recorte' | 'valor' | 'fonte' | 'notas')[]
  className?: string
}) {
  const cabecalhos = {
    referencia: { header: 'Referência' },
    recorte: { header: 'Recorte' },
    valor: { header: 'Valor', align: 'right' as const },
    fonte: { header: 'Fonte' },
    notas: { header: 'Notas' },
  }
  return (
    <DataTable
      className={className}
      caption={caption}
      columns={colunas.map((key) => ({ key, ...cabecalhos[key] }))}
      rows={dados.map((dado) => ({
        key: dado.id,
        cells: {
          referencia: dado.referencia.rotulo,
          recorte: rotuloRecorte(dado),
          valor: <ValorNaTabela dado={dado} unidade={unidade} />,
          fonte: dado.fonte.nome,
          notas: dado.notas.length ? dado.notas.join(' ') : '—',
        },
      }))}
    />
  )
}

function VerTabela({ children }: { children: ReactNode }) {
  return (
    <details className="text-[13px]">
      <summary className="cursor-pointer rounded-sm font-medium text-brand-purple focus-visible:shadow-focus">Ver dados em tabela</summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}

function Rodape({ dados, fonte }: { dados: DadoPublico[]; fonte: Fonte }) {
  return (
    <>
      <FonteDoDado fonte={fonte} />
      <Notas notas={notasDe(dados)} />
    </>
  )
}

function CabecalhoDoBloco({
  titulo,
  descricao,
  referencia,
  dados,
}: {
  titulo: string
  descricao: string
  referencia?: string
  dados: DadoPublico[]
}) {
  return (
    <CardHeader className="gap-1 p-5 pb-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle className="text-base">{titulo}</CardTitle>
        {dados.some((d) => d.demonstracao) ? <DemoBadge /> : null}
      </div>
      <CardDescription>{descricao}</CardDescription>
      {referencia ? <p className="text-xs font-semibold text-brand-purple">Referência: {referencia}</p> : null}
    </CardHeader>
  )
}

export function BlocoSerie({ bloco, indicador, unidade }: { bloco: BlocoDe<'serie'>; indicador: string; unidade: Unidade }) {
  const periodo = bloco.periodicidade === 'anual' ? 'anual' : 'mensal'
  const inicio = bloco.dados[0].referencia.rotulo
  const fim = bloco.dados[bloco.dados.length - 1].referencia.rotulo
  return (
    <Card>
      <CabecalhoDoBloco
        titulo={`Série ${periodo} · ${bloco.recorte}`}
        descricao={`Um ponto por referência ${periodo}, em ${unidade.nome}, da mesma fonte. Acumulados e levantamentos não entram na série.`}
        referencia={`${inicio} a ${fim}`}
        dados={bloco.dados}
      />
      <CardContent className="flex flex-col gap-4 p-5 pt-0">
        <ColumnChart
          ariaLabel={`${indicador}: série ${periodo} de ${inicio} a ${fim}. Os valores estão na tabela.`}
          larguraMinimaColuna={48}
          data={bloco.dados.map((dado) => ({
            label: rotuloCurto(dado.referencia),
            valor: valorNumerico(dado),
            rotulo: textoCurto(dado, unidade),
            detalhe: `${textoDoValor(dado, unidade)} · ${dado.referencia.rotulo}`,
          }))}
        />
        <VerTabela>
          <TabelaDosDados
            dados={bloco.dados}
            unidade={unidade}
            caption={`${indicador}: série ${periodo}`}
            colunas={['referencia', 'valor', 'notas']}
          />
        </VerTabela>
        <Rodape dados={bloco.dados} fonte={bloco.fonte} />
      </CardContent>
    </Card>
  )
}

export function BlocoCategorias({
  bloco,
  indicador,
  unidade,
}: {
  bloco: BlocoDe<'categorias'>
  indicador: string
  unidade: Unidade
}) {
  return (
    <Card>
      <CabecalhoDoBloco
        titulo={bloco.classificacao.nome}
        descricao={`Cada categoria em ${unidade.nome}, na mesma referência e fonte. Cada valor tem sua própria base; as categorias não são somadas.`}
        referencia={bloco.referencia.rotulo}
        dados={bloco.dados}
      />
      <CardContent className="flex flex-col gap-4 p-5 pt-0">
        <HorizontalBars
          max={unidade.maximo ?? undefined}
          data={bloco.dados.map((dado) => ({
            key: dado.id,
            label: dado.categoria?.nome ?? 'Total',
            valor: valorNumerico(dado),
            rotulo: textoDoValor(dado, unidade),
          }))}
        />
        <VerTabela>
          <TabelaDosDados
            dados={bloco.dados}
            unidade={unidade}
            caption={`${indicador}: ${bloco.classificacao.nome}, ${bloco.referencia.rotulo}`}
            colunas={['recorte', 'valor', 'notas']}
          />
        </VerTabela>
        <Rodape dados={bloco.dados} fonte={bloco.fonte} />
      </CardContent>
    </Card>
  )
}

/** Valores sem série nem comparativo: cada um com referência e recorte, em texto. */
export function BlocoValores({ bloco, unidade }: { bloco: BlocoDe<'valores'>; unidade: Unidade }) {
  return (
    <Card>
      <CabecalhoDoBloco
        titulo={bloco.dados.length === 1 ? 'Valor' : 'Valores'}
        descricao={`Em ${unidade.nome}. Cada valor vale para a sua referência e o seu recorte; eles não são somados.`}
        dados={bloco.dados}
      />
      <CardContent className="flex flex-col gap-4 p-5 pt-0">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {bloco.dados.map((dado) => (
            <li key={dado.id} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-line p-4">
              <p className="text-[13px] font-medium text-ink-muted">{rotuloRecorte(dado)}</p>
              <p className="break-words text-2xl font-bold leading-tight tracking-tight text-ink tabular-nums">
                {textoDoValor(dado, unidade)}
              </p>
              {foiArredondado(dado, unidade) ? (
                <p className="break-all text-[11px] text-ink-muted">Valor recebido: {formatDecimal(dado.valor)}</p>
              ) : null}
              <p className="text-xs font-semibold text-brand-purple">Referência: {dado.referencia.rotulo}</p>
              <Notas notas={dado.notas} />
            </li>
          ))}
        </ul>
        <FonteDoDado fonte={bloco.fonte} />
      </CardContent>
    </Card>
  )
}
