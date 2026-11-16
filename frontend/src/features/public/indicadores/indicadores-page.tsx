import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight, Search } from 'lucide-react'
import { errorMessage } from '@/api/http/api-error'
import { PublicContainer, PublicPageHeader } from '@/components/layout/public-layout'
import {
  Alert,
  Button,
  EmptyState,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@/components/ui'
import { referenciasDe, resumoDoIndicador } from '@/lib/consulta'
import { PARAMETROS_ANTIGOS, type IndicadoresSearch } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import type { ConsultaFiltro, IndicadorConsulta, PeriodoOpcao, SetorObservatorio } from '@/models'
import { useOpcoesConsulta, useResultadoConsulta } from '@/queries/consulta-indicadores.queries'
import { LimparFiltros } from '../filtros-publicos'
import { IndicadorDetalhe } from './indicador-detalhe'

const TODOS = '__todos'
const comTodos = (valor?: string) => valor ?? TODOS
const semTodos = (valor: string) => (valor === TODOS ? undefined : valor)

const SEM_RESULTADO = 'Não há dados publicados para esta seleção.'

function Cabecalho() {
  return (
    <PublicPageHeader
      eyebrow="Indicadores"
      title="Indicadores de Santa Rita do Sapucaí"
      description="Escolha um Setor do Observatório e um Ano/Período para consultar os indicadores disponíveis, com suas referências e fontes."
    />
  )
}

export function IndicadoresPage({ search }: { search: IndicadoresSearch }) {
  const navigate = useNavigate({ from: '/indicadores' })

  // Setor e Ano/Período da URL só valem depois de conferidos com as opções da API.
  const gerais = useOpcoesConsulta()
  const setores = gerais.data?.setores
  const setorAplicado = setores?.some((s) => s.codigo === search.setor) ? search.setor : undefined
  const setorDesconhecido = !!setores && !!search.setor && !setorAplicado
  const opcoesAplicadas = useOpcoesConsulta(setorAplicado, !!setores)
  const periodos = opcoesAplicadas.data?.periodos
  const periodoAplicado = periodos?.some((p) => p.chave === search.periodo) ? search.periodo : undefined
  const periodoIncompativel = !!periodos && !!search.periodo && !periodoAplicado
  const antigos = PARAMETROS_ANTIGOS.filter((chave) => search[chave] !== undefined)
  const urlConferida = !!setores && !!periodos && !setorDesconhecido && !periodoIncompativel && !antigos.length

  const filtro: ConsultaFiltro = { setor: setorAplicado, periodo: periodoAplicado }
  const resultado = useResultadoConsulta(filtro, urlConferida)

  const [avisos, setAvisos] = React.useState<string[]>([])

  // Retira da URL o que não pode ser aplicado e explica o motivo; nunca troca por outro setor ou período.
  React.useEffect(() => {
    if (!setores || !periodos) return
    const mensagens: string[] = []
    if (antigos.length)
      mensagens.push(
        'Parâmetros antigos do endereço (cidade, tema ou recortes) foram retirados. A consulta é sempre de Santa Rita do Sapucaí.',
      )
    if (setorDesconhecido) mensagens.push('O setor informado no endereço não foi reconhecido e foi retirado.')
    if (periodoIncompativel)
      mensagens.push(
        setorAplicado
          ? 'O Ano/Período informado no endereço não tem dados publicados neste setor e voltou para Todos os períodos.'
          : 'O Ano/Período informado no endereço não foi reconhecido e voltou para Todos os períodos.',
      )
    if (!mensagens.length) return
    setAvisos(mensagens)
    void navigate({
      search: { setor: setorAplicado, periodo: periodoAplicado, indicador: search.indicador },
      replace: true,
    })
  }, [setores, periodos, setorDesconhecido, periodoIncompativel, antigos.length, setorAplicado, periodoAplicado, search.indicador, navigate])

  // O indicador aberto que saiu da lista é fechado.
  const indicadores = resultado.data?.indicadores
  const aberto = indicadores?.find((i) => i.codigo === search.indicador)
  const resultadoAtual = !!indicadores && !resultado.isPlaceholderData
  React.useEffect(() => {
    if (!resultadoAtual || !search.indicador || aberto) return
    setAvisos((atuais) => [...atuais, 'O indicador aberto não tem dados publicados nesta seleção e foi fechado.'])
    void navigate({ search: (anterior) => ({ ...anterior, indicador: undefined }), replace: true })
  }, [resultadoAtual, search.indicador, aberto, navigate])

  const aplicar = (proximo: ConsultaFiltro) => {
    setAvisos([])
    void navigate({ search: { setor: proximo.setor, periodo: proximo.periodo, indicador: search.indicador } })
  }

  const setorNome = setores?.find((s) => s.codigo === setorAplicado)?.nome
  const periodoRotulo = gerais.data?.periodos.find((p) => p.chave === periodoAplicado)?.rotulo
  const selecao = `${setorNome ?? 'Todos os setores'} · ${periodoRotulo ?? 'Todos os períodos'}`

  if (gerais.error) {
    return (
      <PublicContainer>
        <Cabecalho />
        <EmptyState
          title="Não foi possível carregar os filtros"
          description={errorMessage(gerais.error)}
          action={
            <Button variant="secondary" onClick={() => void gerais.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </PublicContainer>
    )
  }

  return (
    <PublicContainer>
      <Cabecalho />

      {setores && gerais.data ? (
        <FiltrosGerais
          setores={setores}
          todosOsPeriodos={gerais.data.periodos}
          aplicado={filtro}
          onAplicar={aplicar}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]" aria-busy="true" aria-label="Carregando os filtros">
          <Skeleton className="h-[68px] rounded-md" />
          <Skeleton className="h-[68px] rounded-md" />
          <Skeleton className="h-11 w-48 self-end rounded-md" />
        </div>
      )}

      {avisos.length ? (
        <Alert variant="warning">
          <ul className="flex flex-col gap-1">
            {avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {opcoesAplicadas.error ? (
        <EmptyState
          title="Não foi possível carregar os períodos deste setor"
          description={errorMessage(opcoesAplicadas.error)}
          action={
            <Button variant="secondary" onClick={() => void opcoesAplicadas.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : resultado.error ? (
        <EmptyState
          title="Não foi possível carregar os indicadores"
          description={errorMessage(resultado.error)}
          action={
            <Button variant="secondary" onClick={() => void resultado.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : !indicadores ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" aria-busy="true" aria-label="Carregando os indicadores">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="hidden h-96 rounded-2xl lg:block" />
        </div>
      ) : !indicadores.length ? (
        <EmptyState
          title={SEM_RESULTADO}
          description="Revise os filtros."
          action={filtro.setor || filtro.periodo ? <LimparFiltros onClick={() => aplicar({})} /> : undefined}
        />
      ) : (
        <Resultados
          indicadores={indicadores}
          aberto={aberto}
          selecao={selecao}
          atualizando={resultado.isFetching}
          onAbrir={() => setAvisos([])}
          onFechar={() =>
            void navigate({ search: (anterior) => ({ ...anterior, indicador: undefined }), resetScroll: false })
          }
        />
      )}
    </PublicContainer>
  )
}

/** Setor e Ano/Período em rascunho até Aplicar; os períodos oferecidos dependem do setor escolhido. */
function FiltrosGerais({
  setores,
  todosOsPeriodos,
  aplicado,
  onAplicar,
}: {
  setores: SetorObservatorio[]
  todosOsPeriodos: PeriodoOpcao[]
  aplicado: ConsultaFiltro
  onAplicar: (filtro: ConsultaFiltro) => void
}) {
  const [rascunho, setRascunho] = React.useState<ConsultaFiltro>(aplicado)
  const [aviso, setAviso] = React.useState<string>()
  React.useEffect(() => setRascunho({ setor: aplicado.setor, periodo: aplicado.periodo }), [aplicado.setor, aplicado.periodo])

  const opcoes = useOpcoesConsulta(rascunho.setor)
  const periodos = opcoes.data?.periodos

  // Trocar o setor limpa o período que não tem dados nele, avisando a mudança.
  React.useEffect(() => {
    if (!periodos || !rascunho.periodo || periodos.some((p) => p.chave === rascunho.periodo)) return
    const rotulo = todosOsPeriodos.find((p) => p.chave === rascunho.periodo)?.rotulo ?? 'O período escolhido'
    const setor = setores.find((s) => s.codigo === rascunho.setor)?.nome ?? 'este setor'
    setAviso(`${rotulo} não tem dados publicados em ${setor}. O Ano/Período voltou para Todos os períodos.`)
    setRascunho((atual) => ({ ...atual, periodo: undefined }))
  }, [periodos, rascunho.periodo, rascunho.setor, setores, todosOsPeriodos])

  const alterado = rascunho.setor !== aplicado.setor || rascunho.periodo !== aplicado.periodo
  const temFiltro = !!(aplicado.setor || aplicado.periodo || rascunho.setor || rascunho.periodo)

  return (
    <form
      role="search"
      aria-label="Filtros gerais"
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onAplicar(rascunho)
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <FormField label="Setor" htmlFor="filtro-setor">
          <Select
            value={comTodos(rascunho.setor)}
            onValueChange={(valor) => {
              setAviso(undefined)
              setRascunho((atual) => ({ ...atual, setor: semTodos(valor) }))
            }}
          >
            <SelectTrigger id="filtro-setor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os setores</SelectItem>
              {setores.map((setor) => (
                <SelectItem key={setor.codigo} value={setor.codigo}>
                  {setor.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Ano/Período"
          htmlFor="filtro-periodo"
          hint={opcoes.isPending ? 'Carregando os períodos do setor…' : undefined}
          error={opcoes.error ? 'Não foi possível carregar os períodos deste setor.' : undefined}
        >
          <Select
            value={comTodos(rascunho.periodo)}
            onValueChange={(valor) => {
              setAviso(undefined)
              setRascunho((atual) => ({ ...atual, periodo: semTodos(valor) }))
            }}
            disabled={!periodos}
          >
            <SelectTrigger id="filtro-periodo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os períodos</SelectItem>
              {periodos?.map((periodo) => (
                <SelectItem key={periodo.chave} value={periodo.chave}>
                  {periodo.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" variant="gradient" disabled={!periodos}>
            Aplicar
          </Button>
          <LimparFiltros
            desabilitado={!temFiltro}
            onClick={() => {
              setAviso(undefined)
              setRascunho({})
              onAplicar({})
            }}
          />
        </div>
      </div>
      {aviso ? <Alert variant="info">{aviso}</Alert> : null}
      {alterado && !aviso ? <p className="text-xs text-ink-muted">Clique em Aplicar para atualizar a lista.</p> : null}
    </form>
  )
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Resultados({
  indicadores,
  aberto,
  selecao,
  atualizando,
  onAbrir,
  onFechar,
}: {
  indicadores: IndicadorConsulta[]
  aberto: IndicadorConsulta | undefined
  selecao: string
  atualizando: boolean
  onAbrir: () => void
  onFechar: () => void
}) {
  const [busca, setBusca] = React.useState('')
  const [abertoPeloUsuario, setAbertoPeloUsuario] = React.useState(false)
  const ultimoAberto = React.useRef<string>(undefined)
  const termo = normalizar(busca.trim())
  const visiveis = termo ? indicadores.filter((i) => normalizar(i.nome).includes(termo)) : indicadores

  // Ao fechar o detalhe, o foco volta ao item da lista.
  React.useEffect(() => {
    if (aberto) {
      ultimoAberto.current = aberto.codigo
      return
    }
    if (!ultimoAberto.current) return
    document.getElementById(`item-${ultimoAberto.current}`)?.focus()
    ultimoAberto.current = undefined
  }, [aberto])

  const quantidade = `${indicadores.length} ${indicadores.length === 1 ? 'indicador' : 'indicadores'}`

  return (
    <div className={cn('flex flex-col gap-4 transition-opacity', atualizando && 'opacity-70')} aria-busy={atualizando}>
      <p className="text-[13px] text-ink-muted" aria-live="polite">
        {quantidade} com dados publicados em {selecao}.
      </p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <section
          aria-label="Lista de indicadores"
          className={cn(
            'flex flex-col gap-3 lg:sticky lg:top-[92px] lg:max-h-[calc(100dvh-110px)] lg:overflow-y-auto lg:pr-1',
            aberto && 'hidden lg:flex',
          )}
        >
          <FormField label="Buscar na lista" htmlFor="busca-indicador" labelVariant="field">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
              <Input
                id="busca-indicador"
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Nome do indicador"
                className="pl-9"
              />
            </div>
          </FormField>
          {!visiveis.length ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-muted">
              Nenhum indicador da lista tem esse nome.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {visiveis.map((indicador) => (
                <li key={indicador.codigo}>
                  <ItemDaLista
                    indicador={indicador}
                    ativo={indicador.codigo === aberto?.codigo}
                    onAbrir={() => {
                      setAbertoPeloUsuario(true)
                      onAbrir()
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className={cn('min-w-0', !aberto && 'hidden lg:block')}>
          {aberto ? (
            <IndicadorDetalhe
              key={aberto.codigo}
              indicador={aberto}
              selecao={selecao}
              atualizando={atualizando}
              focarAoAbrir={abertoPeloUsuario}
              onFechar={onFechar}
            />
          ) : (
            <EmptyState
              className="bg-surface py-16"
              title="Escolha um indicador da lista"
              description="O detalhe mostra a definição, a unidade, os dados com referência e fonte, os gráficos e a tabela."
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ItemDaLista({ indicador, ativo, onAbrir }: { indicador: IndicadorConsulta; ativo: boolean; onAbrir: () => void }) {
  const referencias = referenciasDe(indicador.dados).map((r) => r.rotulo)
  return (
    <Link
      id={`item-${indicador.codigo}`}
      to="/indicadores"
      search={(anterior) => ({ ...anterior, indicador: indicador.codigo })}
      resetScroll={false}
      aria-current={ativo ? 'true' : undefined}
      onClick={onAbrir}
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand-purple/40 focus-visible:shadow-focus',
        ativo && 'border-brand-purple bg-info-soft',
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="break-words text-sm font-semibold text-ink">{indicador.nome}</span>
        <span className="text-xs text-ink-muted">
          {indicador.unidade.nome} · {resumoDoIndicador(indicador)}
        </span>
        <span className="line-clamp-2 text-xs text-brand-purple">
          {referencias.slice(0, 3).join(' · ')}
          {referencias.length > 3 ? ` · +${referencias.length - 3}` : ''}
        </span>
      </span>
      <ChevronRight aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-subtle group-hover:text-brand-purple" />
    </Link>
  )
}
