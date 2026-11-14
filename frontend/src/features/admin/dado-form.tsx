import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, Plus } from 'lucide-react'
import { ApiError } from '@/api/http/api-error'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FilterChip,
  FilterChips,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { arredondarDecimal } from '@/lib/decimal'
import { descreverUnidade, formatValorObservacao } from '@/lib/format'
import { mesLongo } from '@/lib/periodo'
import { TIPOS_REFERENCIA } from '@/lib/referencia'
import type { CatalogosAdmin, DadoEntrada, DefinicaoIndicador, Qualificador, TipoReferencia } from '@/models'
import { DialogoNovaCategoria, DialogoNovaFonte } from './catalogo-dialogos'
import { LinksFonte } from './dado-resumo'
import {
  ORDEM_CAMPOS,
  errosDaApi,
  idDoDadoExistente,
  validarDado,
  validarValor,
  type CampoDado,
  type DadoRascunho,
  type ErrosDado,
} from './dado-validacao'
import { TEXTOS_ADMIN } from './textos'

const MESES = Array.from({ length: 12 }, (_, i) => i + 1)

export const IDS: Record<CampoDado, string> = {
  indicador: 'dado-indicador',
  categoria: 'dado-categoria',
  referenciaTipo: 'dado-referencia',
  ano: 'dado-ano',
  mes: 'dado-mes',
  anoInicio: 'dado-ano-inicio',
  anoFim: 'dado-ano-fim',
  dataExtracao: 'dado-data-extracao',
  valor: 'dado-valor',
  fonte: 'dado-fonte',
  notas: 'dado-notas',
}

/** Leva o foco ao primeiro campo com erro, na ordem da tela. */
export function focarPrimeiroErro(erros: ErrosDado) {
  const primeiro = ORDEM_CAMPOS.find((campo) => erros[campo])
  if (primeiro) document.getElementById(IDS[primeiro])?.focus()
}

interface CamposDadoProps {
  r: DadoRascunho
  definicao: DefinicaoIndicador
  catalogos: CatalogosAdmin
  erros: ErrosDado
  desabilitado?: boolean
  onAlterar: (parcial: Partial<DadoRascunho>, limpar?: CampoDado[]) => void
}

/** Categoria, referência, valor, fonte e notas: iguais no cadastro e na correção. */
export function CamposDado({ r, definicao, catalogos, erros, desabilitado, onAlterar }: CamposDadoProps) {
  const [novaFonte, setNovaFonte] = React.useState(false)
  const [novaCategoria, setNovaCategoria] = React.useState(false)

  const invalido = (campo: CampoDado) => ({ 'aria-invalid': !!erros[campo], 'aria-describedby': `${IDS[campo]}-message` })

  const unidade = definicao.unidade
  const fonte = catalogos.fontes.find((f) => f.codigo === r.fonte)
  const tipos = TIPOS_REFERENCIA.filter((t) => definicao.tiposReferenciaPermitidos.includes(t.tipo))

  // Se a definição exige categoria, não existe "sem categoria".
  const recorte = definicao.aceitaSemCategoria ? r.recorte : 'categoria'
  const classificacoes = definicao.classificacoesPermitidas
  const categorias = catalogos.categorias.filter((c) => c.classificacaoCodigo === r.classificacao)
  const categoriaAtual = categorias.find((c) => c.codigo === r.categoria)

  const valorValido = r.valor ? validarValor(r.valor, unidade) : null
  const previa =
    valorValido && 'valor' in valorValido
      ? formatValorObservacao(arredondarDecimal(valorValido.valor, unidade.casasExibicao), unidade, r.qualificador)
      : null

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Categoria</CardTitle>
          <CardDescription>
            Recorte informado pela fonte, em uma das classificações aceitas pelo indicador. Quando o indicador aceita, o valor pode ser o
            total informado pela fonte, sem categoria.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {definicao.aceitaSemCategoria ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-xs font-medium text-ink-muted">Recorte do valor</legend>
              <FilterChips
                aria-label="Recorte do valor"
                value={r.recorte}
                onValueChange={(valor) =>
                  onAlterar(
                    valor === 'sem'
                      ? { recorte: 'sem', classificacao: '', categoria: '' }
                      : { recorte: 'categoria', classificacao: r.classificacao || (classificacoes.length === 1 ? classificacoes[0].codigo : '') },
                    ['categoria'],
                  )
                }
              >
                <FilterChip value="sem" disabled={desabilitado}>
                  Sem categoria (total informado pela fonte)
                </FilterChip>
                <FilterChip value="categoria" disabled={desabilitado}>
                  Com categoria
                </FilterChip>
              </FilterChips>
            </fieldset>
          ) : (
            <p className="text-[13px] text-ink-muted">Este indicador exige uma categoria em cada dado.</p>
          )}

          {recorte === 'categoria' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Classificação" labelVariant="field" htmlFor="dado-classificacao">
                <Select
                  value={r.classificacao}
                  disabled={desabilitado}
                  onValueChange={(valor) => onAlterar({ recorte: 'categoria', classificacao: valor, categoria: '' }, ['categoria'])}
                >
                  <SelectTrigger id="dado-classificacao">
                    <SelectValue placeholder="Selecione a classificação" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)]">
                    {classificacoes.map((c) => (
                      <SelectItem key={c.codigo} value={c.codigo} className="whitespace-normal">
                        {c.nome}
                      </SelectItem>
                    ))}
                    {r.classificacao && !classificacoes.some((c) => c.codigo === r.classificacao) ? (
                      <SelectItem value={r.classificacao}>
                        {catalogos.classificacoes.find((c) => c.codigo === r.classificacao)?.nome ?? r.classificacao}
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label="Categoria"
                labelVariant="field"
                htmlFor={IDS.categoria}
                error={erros.categoria}
                hint={categoriaAtual?.codigoCnae ? `CNAE ${categoriaAtual.codigoCnae}, do catálogo da categoria.` : undefined}
              >
                <Select value={r.categoria} disabled={desabilitado || !r.classificacao} onValueChange={(valor) => onAlterar({ categoria: valor }, ['categoria'])}>
                  <SelectTrigger id={IDS.categoria} {...invalido('categoria')}>
                    <SelectValue placeholder={r.classificacao ? 'Selecione a categoria' : 'Escolha a classificação antes'} />
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
              <Button type="button" variant="secondary" size="sm" className="self-start" disabled={desabilitado} onClick={() => setNovaCategoria(true)}>
                <Plus aria-hidden />
                Nova categoria
              </Button>
            </div>
          ) : definicao.aceitaSemCategoria && erros.categoria ? (
            <p id={`${IDS.categoria}-message`} role="alert" className="text-xs font-medium text-danger">
              {erros.categoria}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referência</CardTitle>
          <CardDescription>
            Use a referência confirmada pela fonte. Só aparecem os tipos aceitos pelo indicador.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <fieldset id={IDS.referenciaTipo} tabIndex={-1} className="flex flex-col gap-2 outline-none">
            <legend className="mb-1.5 text-xs font-medium text-ink-muted">Tipo de referência</legend>
            <FilterChips
              aria-label="Tipo de referência"
              value={r.referenciaTipo}
              onValueChange={(valor) =>
                onAlterar({ referenciaTipo: valor as TipoReferencia }, ['referenciaTipo', 'ano', 'mes', 'anoInicio', 'anoFim', 'dataExtracao'])
              }
            >
              {tipos.map((item) => (
                <FilterChip key={item.tipo} value={item.tipo} disabled={desabilitado}>
                  {item.rotulo}
                </FilterChip>
              ))}
            </FilterChips>
            {r.referenciaTipo ? (
              <p className="text-[13px] text-ink-muted">{TIPOS_REFERENCIA.find((item) => item.tipo === r.referenciaTipo)?.descricao}</p>
            ) : null}
            {erros.referenciaTipo ? (
              <p id={`${IDS.referenciaTipo}-message`} role="alert" className="text-xs font-medium text-danger">
                {erros.referenciaTipo}
              </p>
            ) : null}
          </fieldset>

          {r.referenciaTipo === 'anual' || r.referenciaTipo === 'mensal' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoAno id={IDS.ano} label="Ano" valor={r.ano} erro={erros.ano} desabilitado={desabilitado} onChange={(valor) => onAlterar({ ano: valor }, ['ano'])} />
              {r.referenciaTipo === 'mensal' ? (
                <FormField label="Mês" labelVariant="field" htmlFor={IDS.mes} error={erros.mes}>
                  <Select value={r.mes} disabled={desabilitado} onValueChange={(valor) => onAlterar({ mes: valor }, ['mes'])}>
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
              <CampoAno id={IDS.anoInicio} label="Ano inicial" valor={r.anoInicio} erro={erros.anoInicio} desabilitado={desabilitado} onChange={(valor) => onAlterar({ anoInicio: valor }, ['anoInicio'])} />
              <CampoAno id={IDS.anoFim} label="Ano final" valor={r.anoFim} erro={erros.anoFim} desabilitado={desabilitado} onChange={(valor) => onAlterar({ anoFim: valor }, ['anoFim'])} />
            </div>
          ) : r.referenciaTipo === 'retrato' ? (
            <FormField label="Data da extração" labelVariant="field" htmlFor={IDS.dataExtracao} error={erros.dataExtracao} className="sm:max-w-xs">
              <Input
                id={IDS.dataExtracao}
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                value={r.dataExtracao}
                disabled={desabilitado}
                onChange={(event) => onAlterar({ dataExtracao: event.target.value }, ['dataExtracao'])}
                {...invalido('dataExtracao')}
              />
            </FormField>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valor</CardTitle>
          <CardDescription>
            Informe o valor pronto, como recebido. O sistema não calcula indicadores e guarda todas as casas decimais.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            label={`Valor (${unidade.nome})`}
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
              disabled={desabilitado}
              onChange={(event) => onAlterar({ valor: event.target.value }, ['valor'])}
              {...invalido('valor')}
            />
          </FormField>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-xs font-medium text-ink-muted">O valor é</legend>
            <FilterChips aria-label="Qualificador" value={r.qualificador} onValueChange={(valor) => onAlterar({ qualificador: valor as Qualificador })}>
              <FilterChip value="igual" disabled={desabilitado}>
                Igual ao informado
              </FilterChip>
              <FilterChip value="maior_que" disabled={desabilitado}>
                Mais de (limite)
              </FilterChip>
            </FilterChips>
          </fieldset>
          {previa ? (
            <p className="text-[13px] text-ink-muted">
              Na consulta pública: <strong className="font-semibold text-ink">{previa}</strong>
              {unidade.casasExibicao ? ' (arredondado só na exibição; o valor exato é preservado)' : null}
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
            <Select value={r.fonte} disabled={desabilitado} onValueChange={(valor) => onAlterar({ fonte: valor }, ['fonte'])}>
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
          <Button type="button" variant="secondary" size="sm" className="self-start" disabled={desabilitado} onClick={() => setNovaFonte(true)}>
            <Plus aria-hidden />
            Nova fonte
          </Button>

          <FormField
            label="Notas"
            labelVariant="field"
            htmlFor={IDS.notas}
            error={erros.notas}
            hint="Opcional. Uma nota por linha, com até 2.000 caracteres: cobertura, respostas múltiplas e outras ressalvas."
          >
            <Textarea id={IDS.notas} value={r.notas} disabled={desabilitado} onChange={(event) => onAlterar({ notas: event.target.value }, ['notas'])} {...invalido('notas')} />
          </FormField>
        </CardContent>
      </Card>

      <DialogoNovaFonte aberto={novaFonte} onFechar={() => setNovaFonte(false)} onCriado={(f) => onAlterar({ fonte: f.codigo }, ['fonte'])} />
      <DialogoNovaCategoria
        aberto={novaCategoria}
        onFechar={() => setNovaCategoria(false)}
        classificacoes={classificacoes}
        classificacaoInicial={r.classificacao || classificacoes[0]?.codigo}
        onCriado={(c) => onAlterar({ recorte: 'categoria', classificacao: c.classificacaoCodigo, categoria: c.codigo }, ['categoria'])}
      />
    </>
  )
}

function CampoAno({
  id,
  label,
  valor,
  erro,
  desabilitado,
  onChange,
}: {
  id: string
  label: string
  valor: string
  erro?: string
  desabilitado?: boolean
  onChange: (valor: string) => void
}) {
  return (
    <FormField label={label} labelVariant="field" htmlFor={id} error={erro}>
      <Input
        id={id}
        inputMode="numeric"
        maxLength={4}
        placeholder="AAAA"
        value={valor}
        disabled={desabilitado}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!!erro}
        aria-describedby={`${id}-message`}
      />
    </FormField>
  )
}

/** O que herdam do indicador: unidade com limites, setores e município fixo. Não são campos do dado. */
export function HerdadoDoIndicador({ definicao }: { definicao: DefinicaoIndicador }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-canvas p-4 text-[13px] text-ink-muted">
      <p className="text-xs font-semibold text-ink">Herdado do indicador (não editável no dado)</p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs">Unidade</dt>
          <dd className="mt-0.5 text-ink">
            {definicao.unidade.nome}
            <span className="block text-xs text-ink-subtle">{descreverUnidade(definicao.unidade)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs">Setores</dt>
          <dd className="mt-0.5 text-ink">{definicao.setores.map((s) => s.nome).join(', ') || 'Nenhum setor informado'}</dd>
        </div>
        <div>
          <dt className="text-xs">Município</dt>
          <dd className="mt-0.5 text-ink">Santa Rita do Sapucaí</dd>
        </div>
      </dl>
    </div>
  )
}

/** Alerta de erro de gravação; recebe o foco ao aparecer. Duplicidade oferece abrir o dado existente. */
export function ErroAoSalvar({ erro, titulo = 'Não foi possível salvar' }: { erro: Error; titulo?: string }) {
  const existente = idDoDadoExistente(erro)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    ref.current?.focus({ preventScroll: true })
  }, [erro])
  const porCampo = erro instanceof ApiError && Object.keys(erro.fieldErrors).length > 0
  return (
    <Alert ref={ref} tabIndex={-1} variant="danger" className="outline-none">
      <AlertCircle aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{existente ? 'Dado já cadastrado' : titulo}</p>
        <p>{existente ? TEXTOS_ADMIN.dadoDuplicado : porCampo ? 'Revise os campos destacados.' : erro.message}</p>
        {existente ? (
          <Link to="/admin/dados/$dadoId" params={{ dadoId: existente }} className="font-semibold text-brand-purple underline-offset-4 hover:underline">
            Abrir o dado existente
          </Link>
        ) : null}
      </div>
    </Alert>
  )
}

interface DadoFormProps {
  inicial: DadoRascunho
  definicoes: DefinicaoIndicador[]
  catalogos: CatalogosAdmin
  salvando: boolean
  erro: Error | null
  onSalvar: (entrada: DadoEntrada, rascunho: DadoRascunho) => void
}

export function DadoForm({ inicial, definicoes, catalogos, salvando, erro, onSalvar }: DadoFormProps) {
  const [r, setRascunho] = React.useState(inicial)
  const [erros, setErros] = React.useState<ErrosDado>({})

  const ativas = definicoes.filter((d) => !d.arquivado)
  const definicao = ativas.find((d) => d.codigo === r.indicador)

  React.useEffect(() => {
    const daApi = errosDaApi(erro, r.referenciaTipo)
    if (Object.keys(daApi).length) {
      setErros((atuais) => ({ ...atuais, ...daApi }))
      focarPrimeiroErro(daApi)
    }
    // Só reage a um novo erro da API; digitar não deve refazer o mapeamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [erro])

  function alterar(parcial: Partial<DadoRascunho>, limpar: CampoDado[] = []) {
    setRascunho((atual) => ({ ...atual, ...parcial }))
    const campos = [...limpar, ...(Object.keys(parcial) as CampoDado[])]
    setErros((atuais) => {
      const novos = { ...atuais }
      for (const campo of campos) delete novos[campo]
      return novos
    })
  }

  function alterarIndicador(codigo: string) {
    const nova = ativas.find((d) => d.codigo === codigo)
    // Categoria, referência e valor dependem do indicador: recomeçam vazios; fonte e notas ficam.
    setRascunho((atual) => ({
      ...atual,
      indicador: codigo,
      recorte: nova && !nova.aceitaSemCategoria ? 'categoria' : '',
      classificacao: nova?.classificacoesPermitidas.length === 1 ? nova.classificacoesPermitidas[0].codigo : '',
      categoria: '',
      referenciaTipo: '',
      ano: '',
      mes: '',
      anoInicio: '',
      anoFim: '',
      dataExtracao: '',
      valor: '',
    }))
    setErros({})
  }

  function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const resultado = validarDado(r, definicao, catalogos)
    if ('erros' in resultado) {
      setErros(resultado.erros)
      focarPrimeiroErro(resultado.erros)
      return
    }
    setErros({})
    onSalvar(resultado.entrada, r)
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-5">
      {erro ? <ErroAoSalvar erro={erro} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Indicador</CardTitle>
          <CardDescription>O indicador define a unidade, os setores e os tipos de referência aceitos. Só aparecem indicadores ativos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Indicador" labelVariant="field" htmlFor={IDS.indicador} error={erros.indicador}>
            <Select value={r.indicador} onValueChange={alterarIndicador}>
              <SelectTrigger id={IDS.indicador} aria-invalid={!!erros.indicador} aria-describedby={`${IDS.indicador}-message`}>
                <SelectValue placeholder="Selecione o indicador" />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                {ativas.map((d) => (
                  <SelectItem key={d.codigo} value={d.codigo} className="whitespace-normal">
                    {d.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {definicao ? <HerdadoDoIndicador definicao={definicao} /> : null}
        </CardContent>
      </Card>

      {definicao ? (
        <CamposDado
          // Troca de indicador reinicia os campos dependentes dele.
          key={definicao.codigo}
          r={r}
          definicao={definicao}
          catalogos={catalogos}
          erros={erros}
          onAlterar={alterar}
        />
      ) : (
        <p className="rounded-lg bg-canvas p-4 text-[13px] text-ink-muted">
          Escolha o indicador para informar categoria, referência, valor e fonte.
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink-muted">O dado é salvo como rascunho e fica fora da consulta pública até ser publicado.</p>
        <Button type="submit" variant="gradient" disabled={salvando || !definicao}>
          {salvando ? 'Salvando…' : 'Salvar rascunho'}
        </Button>
      </div>
    </form>
  )
}
