import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PublicContainer, PublicPageHeader } from '@/components/layout/public-layout'
import {
  Alert,
  Button,
  EmptyState,
  FilterChip,
  FilterChips,
  FormField,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@/components/ui'
import { rotuloClassificacao, rotuloTipoTerritorio } from '@/lib/catalogo-observacoes'
import {
  aplicarRecorte,
  atendeReferencia,
  compararReferencias,
  filtroAlcanca,
  montarSecoes,
  referenciaKey,
  territorioPrincipal,
} from '@/lib/observacoes'
import { rotuloTipoReferencia } from '@/lib/referencia'
import type { ConsultaSearch } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import type { Catalogos, Observacao } from '@/models'
import { useCatalogosObservacoes, useObservacoes } from '@/queries/observacao.queries'
import { SecaoIndicador } from './consulta/secao-indicador'
import { AvisoFiltro, LimparFiltros } from './filtros-publicos'

const TODOS = 'todos'

interface Rascunho {
  territorio?: string
  ref?: string
  categoria?: string
  cnae?: string
}

export function IndicadoresPage({ search }: { search: ConsultaSearch }) {
  const catalogos = useCatalogosObservacoes()
  const observacoes = useObservacoes({})

  const erro = catalogos.error ?? observacoes.error
  if (erro) {
    return (
      <PublicContainer>
        <Cabecalho />
        <EmptyState title="Não foi possível carregar os indicadores" description={erro.message} />
      </PublicContainer>
    )
  }
  if (!catalogos.data || !observacoes.data) {
    return (
      <PublicContainer>
        <Cabecalho />
        <Skeleton className="h-10 w-full max-w-xl rounded-md" />
        <Skeleton className="h-80 rounded-2xl" />
      </PublicContainer>
    )
  }
  return <Consulta search={search} catalogos={catalogos.data} observacoes={observacoes.data} carregando={observacoes.isFetching} />
}

function Cabecalho() {
  return (
    <PublicPageHeader
      eyebrow="Indicadores"
      title="Dados publicados pelo Observatório"
      description="Valores recebidos das fontes e organizados por tema. Cada número traz unidade, referência, fonte e notas; nada é estimado ou somado pela plataforma."
    />
  )
}

function Consulta({
  search,
  catalogos,
  observacoes,
  carregando,
}: {
  search: ConsultaSearch
  catalogos: Catalogos
  observacoes: Observacao[]
  carregando: boolean
}) {
  const navigate = useNavigate({ from: '/indicadores' })
  const temas = catalogos.temas.filter((t) => t.comDadosPublicados)
  const tema = temas.find((t) => t.codigo === search.tema) ?? temas[0]
  const principal = React.useMemo(() => territorioPrincipal(observacoes), [observacoes])

  const doTema = React.useMemo(
    () => observacoes.filter((o) => tema && o.temas.some((t) => t.codigo === tema.codigo)),
    [observacoes, tema],
  )

  const naoReconhecidos = [
    search.tema && !catalogos.temas.some((t) => t.codigo === search.tema) ? 'tema' : null,
    search.territorio && !catalogos.territorios.some((t) => t.codigo === search.territorio) ? 'cidade' : null,
    search.categoria && !catalogos.categorias.some((c) => c.codigo === search.categoria) ? 'categoria' : null,
  ].filter(Boolean)

  const categoriaFiltrada = catalogos.categorias.find((c) => c.codigo === search.categoria) ?? null
  const classificacaoFiltrada = categoriaFiltrada?.classificacao ?? null
  const recorte = { categoria: categoriaFiltrada?.codigo, cnae: search.cnae }
  const filtroDeRecorte = !!(recorte.categoria || recorte.cnae)

  const doTerritorio = doTema.filter((o) => !search.territorio || o.territorio.codigo === search.territorio)
  const naReferencia = doTerritorio.filter((o) => atendeReferencia(o, search.ref))
  const filtradas = aplicarRecorte(naReferencia, recorte, classificacaoFiltrada)
  const alcancada = (o: Observacao) => filtroAlcanca(o, recorte, classificacaoFiltrada)
  const recorteSemDados = filtroDeRecorte && !filtradas.some(alcancada)
  const cidadesDoTema = [
    ...new Map(doTema.filter((o) => o.territorio.tipo === 'municipio').map((o) => [o.territorio.codigo, o.territorio])).values(),
  ]
  const secoes = montarSecoes(filtradas, cidadesDoTema)

  const [rascunho, setRascunho] = React.useState<Rascunho>(search)
  React.useEffect(() => setRascunho(search), [search])

  const limpar = () => void navigate({ search: { tema: tema?.codigo } })
  const temFiltro = !!(search.territorio || search.ref || search.categoria || search.cnae)

  return (
    <PublicContainer>
      <Cabecalho />

      <div className="flex flex-col gap-5">
        <FilterChips
          aria-label="Tema"
          value={tema?.codigo}
          onValueChange={(codigo) => void navigate({ search: { tema: codigo, territorio: search.territorio } })}
        >
          {temas.map((t) => (
            <FilterChip key={t.codigo} value={t.codigo}>
              {t.nome}
            </FilterChip>
          ))}
        </FilterChips>

        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            void navigate({ search: { tema: tema?.codigo, ...rascunho } })
          }}
        >
          <SeletorTerritorio
            observacoes={doTema}
            value={rascunho.territorio}
            onChange={(territorio) => setRascunho((r) => ({ ...r, territorio }))}
          />
          <SeletorReferencia
            observacoes={doTerritorio}
            value={rascunho.ref}
            onChange={(ref) => setRascunho((r) => ({ ...r, ref }))}
          />
          <SeletorCategoria
            observacoes={doTerritorio}
            catalogos={catalogos}
            value={rascunho.categoria}
            onChange={(categoria) => setRascunho((r) => ({ ...r, categoria }))}
          />
          <SeletorCnae observacoes={doTerritorio} value={rascunho.cnae} onChange={(cnae) => setRascunho((r) => ({ ...r, cnae }))} />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit" variant="gradient">
              Aplicar filtros
            </Button>
            <LimparFiltros desabilitado={!temFiltro} onClick={limpar} />
          </div>
        </form>

        {naoReconhecidos.length ? (
          <Alert variant="warning">
            Filtro não reconhecido no catálogo ({naoReconhecidos.join(', ')}). Ele foi ignorado; limpe os filtros para recomeçar.
          </Alert>
        ) : null}
        {categoriaFiltrada ? (
          <AvisoFiltro>
            O filtro “{categoriaFiltrada.nome}” vale para os recortes de “
            {rotuloClassificacao(categoriaFiltrada.classificacao, catalogos.indicadores)}”. Totais e indicadores sem esse
            recorte continuam exibidos e marcados com “Filtro de recorte não se aplica”.
          </AvisoFiltro>
        ) : null}
        {search.cnae ? (
          <AvisoFiltro>
            O filtro de CNAE vale só para valores com CNAE informado pela fonte. Os demais continuam exibidos sem esse recorte.
          </AvisoFiltro>
        ) : null}
      </div>

      {!doTema.length ? (
        <EmptyState title="Sem dados publicados neste tema" description="O tema aparece aqui quando a equipe publica valores completos." />
      ) : !filtradas.length ? (
        <EmptyState
          title="Nenhum valor publicado para esta combinação"
          description="Ausência de dado não é zero: esta cidade, referência ou recorte não tem valor publicado neste tema."
          action={<LimparFiltros onClick={limpar} />}
        />
      ) : (
        <div className={cn('flex flex-col gap-8 transition-opacity', carregando && 'opacity-70')}>
          {recorteSemDados ? (
            <Alert variant="warning">
              Nenhum valor deste tema tem o recorte selecionado com os demais filtros. Os valores abaixo não têm esse recorte.
            </Alert>
          ) : null}
          <ResumoDoTema observacoes={filtradas} secoes={secoes.length} />
          {secoes.map((secao) => (
            <SecaoIndicador
              key={`${secao.codigo}|${search.territorio ?? ''}|${search.ref ?? ''}|${recorte.categoria ?? ''}|${recorte.cnae ?? ''}`}
              secao={secao}
              territorioPrincipal={principal}
              filtroDeRecorte={filtroDeRecorte}
              alcancada={alcancada}
            />
          ))}
        </div>
      )}
    </PublicContainer>
  )
}

function ResumoDoTema({ observacoes, secoes }: { observacoes: Observacao[]; secoes: number }) {
  const cidades = new Set(observacoes.map((o) => o.territorio.codigo)).size
  const fontes = new Set(observacoes.map((o) => o.fonte.codigo)).size
  return (
    <p className="text-[13px] text-ink-muted">
      {secoes} {secoes === 1 ? 'indicador' : 'indicadores'} · {observacoes.length} {observacoes.length === 1 ? 'valor publicado' : 'valores publicados'} ·{' '}
      {cidades} {cidades === 1 ? 'território' : 'territórios'} · {fontes} {fontes === 1 ? 'fonte' : 'fontes'}
    </p>
  )
}

const comTodos = (valor: string | undefined) => valor ?? TODOS
const semTodos = (valor: string) => (valor === TODOS ? undefined : valor)

function SeletorTerritorio({
  observacoes,
  value,
  onChange,
}: {
  observacoes: Observacao[]
  value?: string
  onChange: (valor?: string) => void
}) {
  const territorios = [...new Map(observacoes.map((o) => [o.territorio.codigo, o.territorio])).values()]
  const tipos = [...new Set(territorios.map((t) => t.tipo))]
  return (
    <FormField label="Cidade ou abrangência" htmlFor="territorio">
      <Select value={comTodos(value)} onValueChange={(v) => onChange(semTodos(v))}>
        <SelectTrigger id="territorio">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todas</SelectItem>
          {tipos.map((tipo) => (
            <SelectGroup key={tipo}>
              <SelectLabel>{rotuloTipoTerritorio(tipo)}</SelectLabel>
              {territorios
                .filter((t) => t.tipo === tipo)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map((t) => (
                  <SelectItem key={t.codigo} value={t.codigo}>
                    {t.nome}
                  </SelectItem>
                ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

function SeletorReferencia({
  observacoes,
  value,
  onChange,
}: {
  observacoes: Observacao[]
  value?: string
  onChange: (valor?: string) => void
}) {
  const referencias = [...new Map(observacoes.map((o) => [referenciaKey(o.referencia), o.referencia])).values()].sort(
    (a, b) => compararReferencias(b, a),
  )
  const tipos = [...new Set(referencias.map((r) => r.tipo))]
  return (
    <FormField label="Referência" htmlFor="referencia">
      <Select value={comTodos(value)} onValueChange={(v) => onChange(semTodos(v))}>
        <SelectTrigger id="referencia">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todas as referências</SelectItem>
          {tipos.map((tipo) => {
            const doTipo = referencias.filter((r) => r.tipo === tipo)
            return (
              <SelectGroup key={tipo}>
                <SelectLabel>{rotuloTipoReferencia(tipo)}</SelectLabel>
                {doTipo.length > 1 ? (
                  <SelectItem value={`tipo:${tipo}`}>Todas: {rotuloTipoReferencia(tipo).toLowerCase()}</SelectItem>
                ) : null}
                {doTipo.map((r) => (
                  <SelectItem key={referenciaKey(r)} value={referenciaKey(r)}>
                    {r.rotulo}
                  </SelectItem>
                ))}
              </SelectGroup>
            )
          })}
        </SelectContent>
      </Select>
    </FormField>
  )
}

function SeletorCategoria({
  observacoes,
  catalogos,
  value,
  onChange,
}: {
  observacoes: Observacao[]
  catalogos: Catalogos
  value?: string
  onChange: (valor?: string) => void
}) {
  const categorias = [
    ...new Map(observacoes.flatMap((o) => (o.categoria ? [[o.categoria.codigo, o.categoria] as const] : []))).values(),
  ]
  const classificacoes = [...new Set(categorias.map((c) => c.classificacao))]
    .map((c) => ({ codigo: c, rotulo: rotuloClassificacao(c, catalogos.indicadores) }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
  return (
    <FormField label="Categoria de origem" htmlFor="categoria">
      <Select value={comTodos(value)} onValueChange={(v) => onChange(semTodos(v))} disabled={!categorias.length}>
        <SelectTrigger id="categoria">
          <SelectValue placeholder="Sem recortes neste tema" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todas as categorias</SelectItem>
          {classificacoes.map((classificacao) => (
            <SelectGroup key={classificacao.codigo}>
              <SelectLabel>{classificacao.rotulo}</SelectLabel>
              {categorias
                .filter((c) => c.classificacao === classificacao.codigo)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map((c) => (
                  <SelectItem key={c.codigo} value={c.codigo}>
                    {c.nome}
                  </SelectItem>
                ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

function SeletorCnae({
  observacoes,
  value,
  onChange,
}: {
  observacoes: Observacao[]
  value?: string
  onChange: (valor?: string) => void
}) {
  const cnaes = [...new Set(observacoes.flatMap((o) => (o.codigoCnae ? [o.codigoCnae] : [])))].sort()
  if (!cnaes.length && !value) return null
  return (
    <FormField label="CNAE" htmlFor="cnae">
      <Select value={comTodos(value)} onValueChange={(v) => onChange(semTodos(v))}>
        <SelectTrigger id="cnae">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os CNAEs</SelectItem>
          {cnaes.map((cnae) => (
            <SelectItem key={cnae} value={cnae}>
              {cnae}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}
