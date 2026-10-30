import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, Lightbulb } from 'lucide-react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  FilterChip,
  FilterChips,
  FormField,
  Input,
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { arredondarDecimal } from '@/lib/decimal'
import { formatValorObservacao } from '@/lib/format'
import { mesLongo } from '@/lib/periodo'
import { TIPOS_REFERENCIA } from '@/lib/referencia'
import type { Catalogos, Cnae, ObservacaoAdmin, ObservacaoEntrada, Qualificador, TipoReferencia, Unidade } from '@/models'
import { useObservacoesAdmin } from '@/queries/admin-observacao.queries'
import {
  classificacoesPara,
  descreverUnidade,
  indicadorDaClassificacao,
  perfilDoIndicador,
  rotuloClassificacao,
  rotuloTipoTerritorio,
  territoriosPorTipo,
} from './observacao-catalogo'
import { LinksFonte } from './observacao-resumo'
import {
  ORDEM_CAMPOS,
  ehConflito,
  errosDaApi,
  validarObservacao,
  validarValor,
  type CampoObservacao,
  type ErrosObservacao,
  type ObservacaoRascunho,
} from './observacao-validacao'

const MESES = Array.from({ length: 12 }, (_, i) => i + 1)
const SEM_CNAE = 'sem-cnae'

const IDS: Record<CampoObservacao, string> = {
  indicador: 'indicador',
  temas: 'temas',
  territorio: 'territorio',
  categoria: 'categoria',
  codigoCnae: 'cnae',
  referenciaTipo: 'referencia',
  ano: 'ano',
  mes: 'mes',
  anoInicio: 'ano-inicio',
  anoFim: 'ano-fim',
  dataExtracao: 'data-extracao',
  unidade: 'unidade',
  valor: 'valor',
  fonte: 'fonte',
  notas: 'notas',
}

interface ObservacaoFormProps {
  inicial: ObservacaoRascunho
  catalogos: Catalogos
  cnaes: Cnae[]
  salvando: boolean
  /** Erro da última tentativa de salvar (validação da API, duplicidade, rede). */
  erro: Error | null
  /** Observação existente com a mesma identidade, quando a API recusa por duplicidade. */
  conflito?: ObservacaoAdmin
  onSalvar: (entrada: ObservacaoEntrada, publicar: boolean, rascunho: ObservacaoRascunho) => void
}

export function ObservacaoForm({ inicial, catalogos, cnaes, salvando, erro, conflito, onSalvar }: ObservacaoFormProps) {
  const [r, setRascunho] = React.useState(inicial)
  const [erros, setErros] = React.useState<ErrosObservacao>({})
  const [publicarAoSalvar, setPublicarAoSalvar] = React.useState(false)

  const unidade = catalogos.unidades.find((u) => u.codigo === r.unidade)
  const fonte = catalogos.fontes.find((f) => f.codigo === r.fonte)

  React.useEffect(() => {
    const daApi = errosDaApi(erro)
    if (Object.keys(daApi).length) setErros((atuais) => ({ ...atuais, ...daApi }))
  }, [erro])

  function alterar<K extends keyof ObservacaoRascunho>(campo: K, valor: ObservacaoRascunho[K]) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }))
    setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  function alterarIndicador(codigo: string) {
    setRascunho((atual) => {
      // Recortes de outro indicador não valem para este; classificações gerais (setor, porte…) continuam.
      const manter = atual.classificacao && !indicadorDaClassificacao(atual.classificacao)
      const propria = classificacoesPara(catalogos.categorias, codigo).doIndicador[0] ?? ''
      return {
        ...atual,
        indicador: codigo,
        classificacao: manter ? atual.classificacao : propria,
        categoria: manter ? atual.categoria : '',
      }
    })
    setErros((atuais) => ({ ...atuais, indicador: undefined, categoria: undefined }))
  }

  function alterarReferencia(tipo: TipoReferencia) {
    alterar('referenciaTipo', tipo)
    setErros((atuais) => ({ ...atuais, ano: undefined, mes: undefined, anoInicio: undefined, anoFim: undefined, dataExtracao: undefined }))
  }

  function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const publicar = (event.nativeEvent as SubmitEvent).submitter?.dataset.publicar === 'true'
    const resultado = validarObservacao(r, catalogos)
    if ('erros' in resultado) {
      setErros(resultado.erros)
      const primeiro = ORDEM_CAMPOS.find((campo) => resultado.erros[campo])
      if (primeiro) document.getElementById(IDS[primeiro])?.focus()
      return
    }
    setErros({})
    setPublicarAoSalvar(publicar)
    onSalvar(resultado.entrada, publicar, r)
  }

  const invalido = (campo: CampoObservacao) => ({
    'aria-invalid': !!erros[campo],
    'aria-describedby': `${IDS[campo]}-message`,
  })

  const valorValido = unidade && r.valor ? validarValor(r.valor, unidade) : null
  const previa = valorValido && 'valor' in valorValido && unidade
    ? formatValorObservacao(arredondarDecimal(valorValido.valor, unidade.casasExibicao), unidade, r.qualificador)
    : null

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-5">
      {erro ? <ErroAoSalvar erro={erro} conflito={conflito} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Indicador e temas</CardTitle>
          <CardDescription>O indicador diz o que se mede; os temas, em quais seções a observação aparece.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Indicador" labelVariant="field" htmlFor={IDS.indicador} error={erros.indicador}>
            <Select value={r.indicador} onValueChange={alterarIndicador}>
              <SelectTrigger id={IDS.indicador} {...invalido('indicador')}>
                <SelectValue placeholder="Selecione o indicador" />
              </SelectTrigger>
              <SelectContent>
                {catalogos.indicadores.map((i) => (
                  <SelectItem key={i.codigo} value={i.codigo}>
                    {i.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {r.indicador ? (
            <PerfilIndicador
              indicador={r.indicador}
              onUsar={(sugestao) => {
                setRascunho((atual) => ({ ...atual, ...sugestao }))
                setErros((atuais) => ({ ...atuais, unidade: undefined, temas: undefined }))
              }}
            />
          ) : null}

          <Grupo id={IDS.temas} legenda="Temas" erro={erros.temas}>
            <div className="grid gap-3 sm:grid-cols-2">
              {catalogos.temas.map((tema) => {
                const id = `tema-${tema.codigo}`
                return (
                  <div key={tema.codigo} className="flex items-center gap-3">
                    <Checkbox
                      id={id}
                      checked={r.temas.includes(tema.codigo)}
                      onCheckedChange={(marcado) =>
                        alterar('temas', marcado === true ? [...r.temas, tema.codigo] : r.temas.filter((t) => t !== tema.codigo))
                      }
                    />
                    <Label htmlFor={id} variant="field" className="text-sm text-ink">
                      {tema.nome}
                    </Label>
                  </div>
                )
              })}
            </div>
          </Grupo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Território e recorte</CardTitle>
          <CardDescription>
            A categoria é o recorte recebido da fonte (setor Sebrae, porte, hospedagem…). O CNAE é uma classificação
            separada e opcional.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Território" labelVariant="field" htmlFor={IDS.territorio} error={erros.territorio}>
            <Select value={r.territorio} onValueChange={(valor) => alterar('territorio', valor)}>
              <SelectTrigger id={IDS.territorio} {...invalido('territorio')}>
                <SelectValue placeholder="Selecione o município, a região ou a base" />
              </SelectTrigger>
              <SelectContent>
                {[...territoriosPorTipo(catalogos.territorios)].map(([tipo, territorios]) => (
                  <SelectGroup key={tipo}>
                    <SelectLabel>{rotuloTipoTerritorio(tipo)}</SelectLabel>
                    {territorios.map((t) => (
                      <SelectItem key={t.codigo} value={t.codigo}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <Grupo id="recorte" legenda="Recorte">
            <FilterChips
              aria-label="Recorte"
              value={r.recorte}
              onValueChange={(valor) => alterar('recorte', valor as ObservacaoRascunho['recorte'])}
            >
              <FilterChip value="total">Total (sem recorte)</FilterChip>
              <FilterChip value="categoria">Categoria da fonte</FilterChip>
            </FilterChips>
          </Grupo>

          {r.recorte === 'categoria' ? (
            <SeletorCategoria
              catalogos={catalogos}
              indicador={r.indicador}
              classificacao={r.classificacao}
              categoria={r.categoria}
              erro={erros.categoria}
              onClassificacao={(valor) => {
                setRascunho((atual) => ({ ...atual, classificacao: valor, categoria: '' }))
                setErros((atuais) => ({ ...atuais, categoria: undefined }))
              }}
              onCategoria={(valor) => alterar('categoria', valor)}
            />
          ) : null}

          <FormField
            label="CNAE (opcional)"
            labelVariant="field"
            htmlFor={IDS.codigoCnae}
            error={erros.codigoCnae}
            hint="Somente quando a fonte informa o código. Nunca deduza o CNAE a partir da categoria."
          >
            <Select value={r.codigoCnae || SEM_CNAE} onValueChange={(valor) => alterar('codigoCnae', valor === SEM_CNAE ? '' : valor)}>
              <SelectTrigger id={IDS.codigoCnae} {...invalido('codigoCnae')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_CNAE}>Sem CNAE</SelectItem>
                {cnaes.map((cnae) => (
                  <SelectItem key={cnae.codigo} value={cnae.codigo}>
                    {cnae.codigo} · {cnae.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referência</CardTitle>
          <CardDescription>
            Use a referência confirmada pela fonte. Se o período não estiver confirmado, não cadastre o valor: não há
            referência para período desconhecido.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Grupo id={IDS.referenciaTipo} legenda="Tipo de referência" erro={erros.referenciaTipo}>
            <FilterChips aria-label="Tipo de referência" value={r.referenciaTipo} onValueChange={(valor) => alterarReferencia(valor as TipoReferencia)}>
              {TIPOS_REFERENCIA.map((item) => (
                <FilterChip key={item.tipo} value={item.tipo}>
                  {item.rotulo}
                </FilterChip>
              ))}
            </FilterChips>
            {r.referenciaTipo ? (
              <p className="text-[13px] text-ink-muted">{TIPOS_REFERENCIA.find((item) => item.tipo === r.referenciaTipo)?.descricao}</p>
            ) : null}
          </Grupo>

          {r.referenciaTipo === 'anual' || r.referenciaTipo === 'mensal' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoAno id={IDS.ano} label="Ano" valor={r.ano} erro={erros.ano} onChange={(valor) => alterar('ano', valor)} />
              {r.referenciaTipo === 'mensal' ? (
                <FormField label="Mês" labelVariant="field" htmlFor={IDS.mes} error={erros.mes}>
                  <Select value={r.mes} onValueChange={(valor) => alterar('mes', valor)}>
                    <SelectTrigger id={IDS.mes} {...invalido('mes')}>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((mes) => (
                        <SelectItem key={mes} value={String(mes)}>
                          {mesLongo(mes)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : null}
            </div>
          ) : r.referenciaTipo === 'acumulada' || r.referenciaTipo === 'levantamento' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoAno id={IDS.anoInicio} label="Ano inicial" valor={r.anoInicio} erro={erros.anoInicio} onChange={(valor) => alterar('anoInicio', valor)} />
              <CampoAno id={IDS.anoFim} label="Ano final" valor={r.anoFim} erro={erros.anoFim} onChange={(valor) => alterar('anoFim', valor)} />
            </div>
          ) : r.referenciaTipo === 'retrato' ? (
            <FormField label="Data da extração" labelVariant="field" htmlFor={IDS.dataExtracao} error={erros.dataExtracao} className="sm:max-w-xs">
              <Input
                id={IDS.dataExtracao}
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={r.dataExtracao}
                onChange={(event) => alterar('dataExtracao', event.target.value)}
                {...invalido('dataExtracao')}
              />
            </FormField>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valor e unidade</CardTitle>
          <CardDescription>
            Informe o valor pronto, como recebido. O sistema não calcula indicadores e guarda todas as casas decimais.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            label="Unidade"
            labelVariant="field"
            htmlFor={IDS.unidade}
            error={erros.unidade}
            hint={unidade ? descreverUnidade(unidade) : 'A unidade define o significado e a validação do valor.'}
          >
            <Select value={r.unidade} onValueChange={(valor) => alterar('unidade', valor)}>
              <SelectTrigger id={IDS.unidade} {...invalido('unidade')}>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {gruposDeUnidades(catalogos.unidades).map((grupo) =>
                  grupo.unidades.length ? (
                    <SelectGroup key={grupo.rotulo}>
                      <SelectLabel>{grupo.rotulo}</SelectLabel>
                      {grupo.unidades.map((u) => (
                        <SelectItem key={u.codigo} value={u.codigo}>
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null,
                )}
              </SelectContent>
            </Select>
          </FormField>

          <Grupo id="qualificador" legenda="O valor é">
            <FilterChips aria-label="Qualificador" value={r.qualificador} onValueChange={(valor) => alterar('qualificador', valor as Qualificador)}>
              <FilterChip value="igual">Igual ao informado</FilterChip>
              <FilterChip value="maior_que">Limite (“mais de”)</FilterChip>
            </FilterChips>
          </Grupo>

          <FormField
            label="Valor"
            labelVariant="field"
            htmlFor={IDS.valor}
            error={erros.valor}
            hint="Sem separador de milhar; vírgula para decimais. Zero informado pela fonte é válido."
            className="sm:max-w-sm"
          >
            <Input
              id={IDS.valor}
              inputMode="decimal"
              autoComplete="off"
              value={r.valor}
              onChange={(event) => alterar('valor', event.target.value)}
              {...invalido('valor')}
            />
          </FormField>
          {previa ? (
            <p className="text-[13px] text-ink-muted">
              Na consulta pública: <strong className="font-semibold text-ink">{previa}</strong>
              {unidade?.casasExibicao ? ' (arredondado só na exibição; o valor exato é preservado)' : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fonte e notas</CardTitle>
          <CardDescription>A fonte e as notas acompanham o valor em toda a consulta pública.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Fonte" labelVariant="field" htmlFor={IDS.fonte} error={erros.fonte}>
            <Select value={r.fonte} onValueChange={(valor) => alterar('fonte', valor)}>
              <SelectTrigger id={IDS.fonte} {...invalido('fonte')}>
                <SelectValue placeholder="Selecione a fonte" />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                {catalogos.fontes.map((f) => (
                  <SelectItem key={f.codigo} value={f.codigo} className="whitespace-normal">
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {fonte ? <LinksFonte fonte={fonte} /> : null}

          <FormField
            label="Notas de leitura (opcional)"
            labelVariant="field"
            htmlFor={IDS.notas}
            error={erros.notas}
            hint="Uma nota por linha: cobertura, respostas múltiplas e outras ressalvas necessárias à leitura."
          >
            <Textarea id={IDS.notas} value={r.notas} onChange={(event) => alterar('notas', event.target.value)} {...invalido('notas')} />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink-muted">Rascunhos ficam fora da consulta pública até serem publicados.</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button type="submit" variant="secondary" data-publicar={false} disabled={salvando}>
            {salvando && !publicarAoSalvar ? 'Salvando…' : 'Salvar rascunho'}
          </Button>
          <Button type="submit" variant="gradient" data-publicar={true} disabled={salvando}>
            {salvando && publicarAoSalvar ? 'Salvando…' : 'Salvar e publicar'}
          </Button>
        </div>
      </div>
    </form>
  )
}

function gruposDeUnidades(unidades: Unidade[]) {
  return [
    { rotulo: 'Contagens (números inteiros)', unidades: unidades.filter((u) => u.inteira) },
    { rotulo: 'Com limite máximo', unidades: unidades.filter((u) => !u.inteira && u.maximo !== null) },
    { rotulo: 'Outras medidas', unidades: unidades.filter((u) => !u.inteira && u.maximo === null) },
  ]
}

/** fieldset com legenda e mensagem, para grupos de controles (temas, recorte, referência). */
function Grupo({ id, legenda, erro, children }: { id: string; legenda: string; erro?: string; children: React.ReactNode }) {
  return (
    <fieldset id={id} tabIndex={-1} aria-describedby={erro ? `${id}-message` : undefined} className="flex flex-col gap-2 outline-none">
      <legend className="mb-1.5 text-xs font-medium text-ink-muted">{legenda}</legend>
      {children}
      {erro ? (
        <p id={`${id}-message`} role="alert" className="text-xs font-medium text-danger">
          {erro}
        </p>
      ) : null}
    </fieldset>
  )
}

function CampoAno({ id, label, valor, erro, onChange }: { id: string; label: string; valor: string; erro?: string; onChange: (valor: string) => void }) {
  return (
    <FormField label={label} labelVariant="field" htmlFor={id} error={erro}>
      <Input
        id={id}
        inputMode="numeric"
        maxLength={4}
        placeholder="AAAA"
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!!erro}
        aria-describedby={`${id}-message`}
      />
    </FormField>
  )
}

interface SeletorCategoriaProps {
  catalogos: Catalogos
  indicador: string
  classificacao: string
  categoria: string
  erro?: string
  onClassificacao: (valor: string) => void
  onCategoria: (valor: string) => void
}

function SeletorCategoria({ catalogos, indicador, classificacao, categoria, erro, onClassificacao, onCategoria }: SeletorCategoriaProps) {
  const { doIndicador, gerais, outras } = classificacoesPara(catalogos.categorias, indicador)
  const grupos = [
    { rotulo: 'Deste indicador', itens: doIndicador },
    { rotulo: 'Classificações da fonte', itens: gerais },
    { rotulo: 'Recortes de outros indicadores', itens: outras },
  ]
  const categorias = catalogos.categorias.filter((c) => c.classificacao === classificacao)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="Classificação" labelVariant="field" htmlFor="classificacao">
        <Select value={classificacao} onValueChange={onClassificacao}>
          <SelectTrigger id="classificacao">
            <SelectValue placeholder="Selecione a classificação" />
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)]">
            {grupos.map((grupo) =>
              grupo.itens.length ? (
                <SelectGroup key={grupo.rotulo}>
                  <SelectLabel>{grupo.rotulo}</SelectLabel>
                  {grupo.itens.map((c) => (
                    <SelectItem key={c} value={c} className="whitespace-normal">
                      {rotuloClassificacao(c, catalogos.indicadores)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : null,
            )}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Categoria" labelVariant="field" htmlFor={IDS.categoria} error={erro}>
        <Select value={categoria} onValueChange={onCategoria} disabled={!classificacao}>
          <SelectTrigger id={IDS.categoria} aria-invalid={!!erro} aria-describedby={`${IDS.categoria}-message`}>
            <SelectValue placeholder={classificacao ? 'Selecione a categoria' : 'Escolha a classificação antes'} />
          </SelectTrigger>
          <SelectContent className="max-w-[calc(100vw-2rem)]">
            {categorias.map((c) => (
              <SelectItem key={c.codigo} value={c.codigo} className="whitespace-normal">
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  )
}

/** Unidade e temas usados nas observações já cadastradas do indicador, aplicados só por escolha do usuário. */
function PerfilIndicador({
  indicador,
  onUsar,
}: {
  indicador: string
  onUsar: (sugestao: Partial<ObservacaoRascunho>) => void
}) {
  const existentes = useObservacoesAdmin({ indicadores: [indicador] })
  // Ao trocar de indicador, o dado anterior fica como placeholder: não sugerir a unidade de outro indicador.
  if (existentes.isPending || existentes.isPlaceholderData) return <Skeleton className="h-16 rounded-lg" />
  if (existentes.error) {
    return (
      <Alert variant="warning">
        <AlertCircle aria-hidden />
        <div className="flex flex-col items-start gap-2">
          <p>Não foi possível carregar as sugestões de unidade e temas: {existentes.error.message}</p>
          <p className="text-[13px] text-ink-muted">Sem elas, confira unidade e temas na fonte.</p>
          <Button type="button" variant="secondary" size="sm" disabled={existentes.isFetching} onClick={() => void existentes.refetch()}>
            {existentes.isFetching ? 'Tentando…' : 'Tentar de novo'}
          </Button>
        </div>
      </Alert>
    )
  }

  const perfil = perfilDoIndicador(existentes.data)
  if (!perfil.total) {
    return (
      <p className="rounded-lg bg-canvas p-4 text-[13px] text-ink-muted">
        Nenhuma observação deste indicador foi cadastrada ainda. Confira unidade e temas na fonte.
      </p>
    )
  }
  const unidadeUnica = perfil.unidades.length === 1 ? perfil.unidades[0] : null
  const temasUnicos = perfil.combinacoesDeTemas.length === 1 ? perfil.combinacoesDeTemas[0] : null

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-canvas p-4 text-[13px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-purple" />
        <p>
          {perfil.total} {perfil.total === 1 ? 'observação cadastrada' : 'observações cadastradas'}. Unidade:{' '}
          <strong className="font-semibold text-ink">{perfil.unidades.map((u) => u.nome).join(', ')}</strong>
          {temasUnicos ? (
            <>
              {' '}· Temas: <strong className="font-semibold text-ink">{temasUnicos.map((t) => t.nome).join(', ')}</strong>
            </>
          ) : null}
        </p>
      </div>
      {unidadeUnica || temasUnicos ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() =>
            onUsar({
              ...(unidadeUnica ? { unidade: unidadeUnica.codigo } : {}),
              ...(temasUnicos ? { temas: temasUnicos.map((t) => t.codigo) } : {}),
            })
          }
        >
          Usar {unidadeUnica && temasUnicos ? 'unidade e temas' : unidadeUnica ? 'unidade' : 'temas'}
        </Button>
      ) : null}
    </div>
  )
}

function ErroAoSalvar({ erro, conflito }: { erro: Error; conflito?: ObservacaoAdmin }) {
  const porCampo = Object.keys(errosDaApi(erro)).length > 0
  const ref = React.useRef<HTMLDivElement>(null)
  // Os botões ficam no fim do formulário: traz o aviso para a vista.
  React.useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    ref.current?.focus({ preventScroll: true })
  }, [erro])
  return (
    <Alert ref={ref} tabIndex={-1} variant="danger" className="outline-none">
      <AlertCircle aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{ehConflito(erro) ? 'Observação já cadastrada' : 'Não foi possível salvar'}</p>
        <p>{porCampo ? 'Revise os campos destacados.' : erro.message}</p>
        {conflito ? (
          <Link
            to="/admin/observacoes/$observacaoId"
            params={{ observacaoId: conflito.id }}
            className="font-semibold text-brand-purple underline-offset-4 hover:underline"
          >
            Abrir a observação existente para corrigi-la
          </Link>
        ) : null}
      </div>
    </Alert>
  )
}
