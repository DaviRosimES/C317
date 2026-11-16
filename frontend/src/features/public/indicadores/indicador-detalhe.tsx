import * as React from 'react'
import { ArrowLeft, RotateCcw, X } from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import {
  SEM_RECORTE,
  aplicarRecorteLocal,
  montarBlocos,
  normalizarRecorte,
  opcoesDoRecorte,
  resumoDoIndicador,
  type RecorteLocal,
} from '@/lib/consulta'
import type { IndicadorConsulta } from '@/models'
import { BlocoCategorias, BlocoSerie, BlocoValores, Notas, TabelaDosDados } from './blocos'

const TODOS = '__todos'
const comTodos = (valor?: string) => valor ?? TODOS
const semTodos = (valor: string) => (valor === TODOS ? undefined : valor)

/**
 * Detalhe de um indicador com os dados que passaram por Setor e Ano/Período. Fonte, classificação e categoria
 * são recortes locais: restringem só este indicador e voltam ao padrão quando deixam de ter dados.
 */
export function IndicadorDetalhe({
  indicador,
  selecao,
  atualizando,
  focarAoAbrir,
  onFechar,
}: {
  indicador: IndicadorConsulta
  /** "Turismo · 2024 — anual", para lembrar a seleção geral. */
  selecao: string
  atualizando: boolean
  focarAoAbrir: boolean
  onFechar: () => void
}) {
  const [escolhido, setEscolhido] = React.useState<RecorteLocal>({})
  const [aviso, setAviso] = React.useState<string>()
  const titulo = React.useRef<HTMLHeadingElement>(null)
  const id = `indicador-${indicador.codigo}`

  // Leva o foco (e a rolagem, no celular) ao detalhe aberto pela lista.
  React.useEffect(() => {
    if (!focarAoAbrir || !titulo.current) return
    titulo.current.focus({ preventScroll: true })
    const { top, bottom } = titulo.current.getBoundingClientRect()
    if (top < 0 || bottom > window.innerHeight) titulo.current.scrollIntoView({ block: 'start' })
  }, [focarAoAbrir, indicador.codigo])

  // Os filtros gerais mudaram os dados: só os recortes que ficaram sem dados são limpos.
  const { recorte, removidos } = normalizarRecorte(indicador.dados, escolhido)
  const retirados = removidos.join(', ')
  React.useEffect(() => {
    if (!retirados) return
    setEscolhido(normalizarRecorte(indicador.dados, escolhido).recorte)
    setAviso(`O recorte local (${retirados}) não tem dados na seleção atual e voltou ao padrão.`)
  }, [retirados, indicador.dados, escolhido])

  const mudar = (proximo: RecorteLocal) => {
    const normalizado = normalizarRecorte(indicador.dados, proximo)
    setEscolhido(normalizado.recorte)
    setAviso(
      normalizado.removidos.length
        ? `Recortes sem dados nesta fonte foram limpos (${normalizado.removidos.join(', ')}).`
        : undefined,
    )
  }

  const opcoes = opcoesDoRecorte(indicador.dados, recorte)
  const dados = aplicarRecorteLocal(indicador.dados, recorte)
  const blocos = montarBlocos(dados)
  const temRecorte = !!(recorte.fonte || recorte.classificacao || recorte.categoria)
  const oferecerClassificacao = opcoes.classificacoes.length > 0

  return (
    <Card aria-labelledby={`${id}-titulo`} className="flex flex-col gap-6 p-5 md:p-6" data-atualizando={atualizando || undefined}>
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-medium text-ink-muted">{selecao}</p>
            <h2
              id={`${id}-titulo`}
              ref={titulo}
              tabIndex={-1}
              className="scroll-mt-28 break-words text-xl font-bold leading-tight text-ink outline-none focus-visible:shadow-focus"
            >
              {indicador.nome}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Fechar o indicador" className="hidden shrink-0 lg:inline-flex">
            <X />
          </Button>
        </div>
        <Button variant="secondary" onClick={onFechar} className="w-full lg:hidden">
          <ArrowLeft aria-hidden />
          Voltar à lista de indicadores
        </Button>
        <p className="text-sm text-ink">{indicador.definicao}</p>
        <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Unidade</dt>
            <dd className="font-medium text-ink">{indicador.unidade.nome}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Nesta seleção</dt>
            <dd className="font-medium text-ink">{resumoDoIndicador(indicador)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Setores do Observatório</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {indicador.setores.map((setor) => (
                <Badge key={setor.codigo} variant="neutral">
                  {setor.nome}
                </Badge>
              ))}
            </dd>
          </div>
        </dl>
        {indicador.notaMetodologica ? <Notas titulo="Nota metodológica" notas={[indicador.notaMetodologica]} /> : null}
      </header>

      {opcoes.fontes.length > 1 || oferecerClassificacao ? (
        <section aria-labelledby={`${id}-recortes`} className="flex flex-col gap-3 rounded-xl bg-canvas p-4">
          <div className="flex flex-col gap-0.5">
            <h3 id={`${id}-recortes`} className="text-sm font-semibold text-ink">
              Recortes deste indicador
            </h3>
            <p className="text-xs text-ink-muted">Valem só para este indicador, dentro do Setor e do Ano/Período escolhidos.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {opcoes.fontes.length > 1 ? (
              <FormField label="Fonte" labelVariant="field" htmlFor={`${id}-fonte`}>
                <Select value={comTodos(recorte.fonte)} onValueChange={(v) => mudar({ ...recorte, fonte: semTodos(v) })}>
                  <SelectTrigger id={`${id}-fonte`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todas as fontes</SelectItem>
                    {opcoes.fontes.map((fonte) => (
                      <SelectItem key={fonte.codigo} value={fonte.codigo}>
                        {fonte.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : null}
            {oferecerClassificacao ? (
              <FormField label="Recorte" labelVariant="field" htmlFor={`${id}-classificacao`}>
                <Select
                  value={comTodos(recorte.classificacao)}
                  onValueChange={(v) => mudar({ ...recorte, classificacao: semTodos(v), categoria: undefined })}
                >
                  <SelectTrigger id={`${id}-classificacao`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos os dados</SelectItem>
                    {opcoes.temTotal ? <SelectItem value={SEM_RECORTE}>Sem recorte (total)</SelectItem> : null}
                    {opcoes.classificacoes.map((classificacao) => (
                      <SelectItem key={classificacao.codigo} value={classificacao.codigo}>
                        {classificacao.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : null}
            {opcoes.categorias.length ? (
              <FormField label="Categoria" labelVariant="field" htmlFor={`${id}-categoria`}>
                <Select value={comTodos(recorte.categoria)} onValueChange={(v) => mudar({ ...recorte, categoria: semTodos(v) })}>
                  <SelectTrigger id={`${id}-categoria`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todas as categorias</SelectItem>
                    {opcoes.categorias.map((categoria) => (
                      <SelectItem key={categoria.codigo} value={categoria.codigo}>
                        {categoria.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : null}
          </div>
          {temRecorte ? (
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => mudar({})}>
              <RotateCcw aria-hidden />
              Limpar recortes
            </Button>
          ) : null}
          {aviso ? <Alert variant="info">{aviso}</Alert> : null}
        </section>
      ) : null}

      {!dados.length ? (
        <EmptyState title="Sem dados para este recorte" description="Ausência de dado não é zero. Escolha outro recorte ou limpe os recortes." />
      ) : (
        <div className="flex flex-col gap-4">
          {blocos.map((bloco) =>
            bloco.tipo === 'serie' ? (
              <BlocoSerie key={bloco.chave} bloco={bloco} indicador={indicador.nome} unidade={indicador.unidade} />
            ) : bloco.tipo === 'categorias' ? (
              <BlocoCategorias key={bloco.chave} bloco={bloco} indicador={indicador.nome} unidade={indicador.unidade} />
            ) : (
              <BlocoValores key={bloco.chave} bloco={bloco} unidade={indicador.unidade} />
            ),
          )}
          <details className="rounded-xl border border-line p-4 text-[13px]">
            <summary className="cursor-pointer rounded-sm font-medium text-brand-purple focus-visible:shadow-focus">
              Todos os dados exibidos ({dados.length})
            </summary>
            <p className="mt-2 text-xs text-ink-muted">
              Totais, recortes e fontes aparecem em linhas próprias e não são somados.
            </p>
            <TabelaDosDados className="mt-3" dados={dados} unidade={indicador.unidade} caption={`${indicador.nome}: dados exibidos`} />
          </details>
        </div>
      )}
    </Card>
  )
}
