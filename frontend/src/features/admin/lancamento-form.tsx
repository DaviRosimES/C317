import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import {
  Alert,
  Badge,
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
  Textarea,
} from '@/components/ui'
import { mesLongo } from '@/lib/periodo'
import type { Cnae, Lancamento, LancamentoEntrada, TipoIndicador } from '@/models'
import {
  ehConflito,
  errosDaApi,
  validarLancamento,
  type CampoLancamento,
  type ErrosLancamento,
  type LancamentoRascunho,
  type Periodicidade,
} from './lancamento-validacao'

const MESES = Array.from({ length: 12 }, (_, i) => i + 1)

const IDS: Record<CampoLancamento, string> = {
  tipo: 'tipo',
  codigoCnae: 'cnae',
  ano: 'ano',
  mes: 'mes',
  valor: 'valor',
  fonte: 'fonte',
}

const UNIDADES: Record<TipoIndicador['unidade'], string> = {
  quantidade: 'Quantidade inteira',
  percentual: 'Percentual (0 a 100)',
  outra: 'Unidade a definir',
}

const DICAS_VALOR: Record<TipoIndicador['unidade'], string> = {
  quantidade: 'Número inteiro e não negativo, sem separador de milhar. Um zero informado pela fonte é válido.',
  percentual: 'Percentual consolidado informado pela fonte, de 0 a 100. Use vírgula para decimais (ex.: 68,25).',
  outra: 'Use vírgula para decimais.',
}

export interface AcaoFormulario {
  rotulo: string
  publicar: boolean
  variant: 'gradient' | 'secondary'
}

interface LancamentoFormProps {
  inicial: LancamentoRascunho
  tipos: TipoIndicador[]
  cnaes: Cnae[]
  acoes: AcaoFormulario[]
  salvando: boolean
  /** Erro da última tentativa de salvar (validação da API, conflito, rede). */
  erro: Error | null
  /** Lançamento já existente com o mesmo tipo, período e CNAE, quando a API recusa por duplicidade. */
  conflito?: Lancamento
  onSalvar: (entrada: LancamentoEntrada, publicar: boolean) => void
}

export function LancamentoForm({ inicial, tipos, cnaes, acoes, salvando, erro, conflito, onSalvar }: LancamentoFormProps) {
  const [rascunho, setRascunho] = React.useState(inicial)
  const [erros, setErros] = React.useState<ErrosLancamento>({})
  const [publicarAoSalvar, setPublicarAoSalvar] = React.useState(false)

  // Lançamentos por estabelecimento não são agregados públicos e exigem um estabelecimento cadastrado.
  const disponiveis = tipos.filter((t) => t.escopo !== 'estabelecimento')
  const tipo = disponiveis.find((t) => t.codigo === rascunho.tipo)
  const grupos = [
    { rotulo: 'Totais municipais', tipos: disponiveis.filter((t) => t.escopo === 'municipal') },
    { rotulo: 'Por setor (CNAE)', tipos: disponiveis.filter((t) => t.escopo === 'cnae') },
  ]

  React.useEffect(() => {
    const daApi = errosDaApi(erro)
    if (Object.keys(daApi).length) setErros((atuais) => ({ ...atuais, ...daApi }))
  }, [erro])

  function alterar<K extends keyof LancamentoRascunho>(campo: K, valor: LancamentoRascunho[K]) {
    setRascunho((atual) => ({ ...atual, [campo]: valor }))
    setErros((atuais) => ({ ...atuais, [campo]: undefined }))
  }

  function alterarTipo(codigo: string) {
    const novo = disponiveis.find((t) => t.codigo === codigo)
    setRascunho((atual) => ({ ...atual, tipo: codigo, codigoCnae: novo?.escopo === 'cnae' ? atual.codigoCnae : '' }))
    setErros((atuais) => ({ ...atuais, tipo: undefined, codigoCnae: undefined, valor: undefined }))
  }

  function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const publicar = (event.nativeEvent as SubmitEvent).submitter?.dataset.publicar === 'true'
    const resultado = validarLancamento(rascunho, tipo)
    if ('erros' in resultado) {
      setErros(resultado.erros)
      const primeiro = (Object.keys(IDS) as CampoLancamento[]).find((campo) => resultado.erros[campo])
      if (primeiro) document.getElementById(IDS[primeiro])?.focus()
      return
    }
    setErros({})
    setPublicarAoSalvar(publicar)
    onSalvar(resultado.entrada, publicar)
  }

  const invalido = (campo: CampoLancamento) => ({
    'aria-invalid': !!erros[campo],
    'aria-describedby': `${IDS[campo]}-message`,
  })

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-5">
      {erro ? <ErroAoSalvar erro={erro} conflito={conflito} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Indicador</CardTitle>
          <CardDescription>O tipo define a unidade do valor e se o lançamento é municipal ou por setor (CNAE).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField label="Tipo de indicador" labelVariant="field" htmlFor={IDS.tipo} error={erros.tipo}>
            <Select value={rascunho.tipo} onValueChange={alterarTipo}>
              <SelectTrigger id={IDS.tipo} {...invalido('tipo')}>
                <SelectValue placeholder="Selecione o indicador" />
              </SelectTrigger>
              <SelectContent>
                {grupos.map((grupo) =>
                  grupo.tipos.length ? (
                    <SelectGroup key={grupo.rotulo}>
                      <SelectLabel>{grupo.rotulo}</SelectLabel>
                      {grupo.tipos.map((t) => (
                        <SelectItem key={t.codigo} value={t.codigo}>
                          {t.nome}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ) : null,
                )}
              </SelectContent>
            </Select>
          </FormField>

          {tipo ? <ResumoTipo tipo={tipo} /> : null}

          {tipo?.escopo === 'cnae' ? (
            <FormField
              label="CNAE"
              labelVariant="field"
              htmlFor={IDS.codigoCnae}
              error={erros.codigoCnae}
              hint="Cada lançamento por setor corresponde a um CNAE do catálogo."
            >
              <Select value={rascunho.codigoCnae} onValueChange={(valor) => alterar('codigoCnae', valor)}>
                <SelectTrigger id={IDS.codigoCnae} {...invalido('codigoCnae')}>
                  <SelectValue placeholder={cnaes.length ? 'Selecione o CNAE' : 'Nenhum CNAE cadastrado'} />
                </SelectTrigger>
                <SelectContent>
                  {cnaes.map((cnae) => (
                    <SelectItem key={cnae.codigo} value={cnae.codigo}>
                      {cnae.codigo} · {cnae.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : tipo ? (
            <p className="text-[13px] text-ink-muted">
              Total municipal: este indicador não recebe CNAE nem estabelecimento.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Período de referência</CardTitle>
          <CardDescription>Referências anuais valem para o ano completo, sem um mês associado.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FilterChips
            aria-label="Periodicidade"
            value={rascunho.periodicidade}
            onValueChange={(valor) => {
              alterar('periodicidade', valor as Periodicidade)
              setErros((atuais) => ({ ...atuais, mes: undefined }))
            }}
          >
            <FilterChip value="mensal">Mensal</FilterChip>
            <FilterChip value="anual">Anual</FilterChip>
          </FilterChips>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Ano" labelVariant="field" htmlFor={IDS.ano} error={erros.ano}>
              <Input
                id={IDS.ano}
                inputMode="numeric"
                maxLength={4}
                value={rascunho.ano}
                onChange={(event) => alterar('ano', event.target.value)}
                {...invalido('ano')}
              />
            </FormField>
            {rascunho.periodicidade === 'mensal' ? (
              <FormField label="Mês" labelVariant="field" htmlFor={IDS.mes} error={erros.mes}>
                <Select value={rascunho.mes} onValueChange={(valor) => alterar('mes', valor)}>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valor e fonte</CardTitle>
          <CardDescription>Informe o valor pronto, como fornecido pela fonte; o sistema não calcula indicadores.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            label="Valor"
            labelVariant="field"
            htmlFor={IDS.valor}
            error={erros.valor}
            hint={DICAS_VALOR[tipo?.unidade ?? 'outra']}
            className="sm:max-w-xs"
          >
            <div className="relative">
              <Input
                id={IDS.valor}
                inputMode="decimal"
                autoComplete="off"
                value={rascunho.valor}
                onChange={(event) => alterar('valor', event.target.value)}
                className={tipo?.unidade === 'percentual' ? 'pr-10' : undefined}
                {...invalido('valor')}
              />
              {tipo?.unidade === 'percentual' ? (
                <span aria-hidden className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-ink-muted">
                  %
                </span>
              ) : null}
            </div>
          </FormField>
          <FormField
            label="Fonte"
            labelVariant="field"
            htmlFor={IDS.fonte}
            error={erros.fonte}
            hint="Base ou relatório, instituição, referência da publicação e URL, quando houver. Aparece junto do valor na consulta pública."
          >
            <Textarea
              id={IDS.fonte}
              maxLength={1000}
              value={rascunho.fonte}
              onChange={(event) => alterar('fonte', event.target.value)}
              {...invalido('fonte')}
            />
          </FormField>
          <div className="flex items-start gap-3">
            <Checkbox
              id="demonstracao"
              checked={rascunho.demonstracao}
              onCheckedChange={(marcado) => alterar('demonstracao', marcado === true)}
              aria-describedby="demonstracao-dica"
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="demonstracao" variant="field" className="text-sm text-ink">
                Valor fictício de demonstração
              </Label>
              <p id="demonstracao-dica" className="text-xs text-ink-subtle">
                Exibe o selo “Dado fictício” na consulta pública. Não marque para dados oficiais.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink-muted">Rascunhos ficam fora da consulta pública até serem publicados.</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {acoes.map((acao) => (
            <Button
              key={acao.rotulo}
              type="submit"
              variant={acao.variant}
              data-publicar={acao.publicar}
              disabled={salvando}
            >
              {salvando && acao.publicar === publicarAoSalvar ? 'Salvando…' : acao.rotulo}
            </Button>
          ))}
        </div>
      </div>
    </form>
  )
}

function ResumoTipo({ tipo }: { tipo: TipoIndicador }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-canvas p-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="neutral" className="bg-surface">
          {UNIDADES[tipo.unidade]}
        </Badge>
        <Badge variant="neutral" className="bg-surface">
          {tipo.escopo === 'cnae'
            ? 'Por setor (CNAE)'
            : tipo.escopo === 'municipal'
              ? 'Total municipal'
              : `Escopo não reconhecido (${tipo.escopoOriginal})`}
        </Badge>
        {tipo.provisorio ? <Badge variant="warning">Definição provisória</Badge> : null}
      </div>
      <p className="text-[13px] text-ink-muted">{tipo.descricao}</p>
      {tipo.fonteReferencia ? <p className="text-xs text-ink-subtle">Referência do catálogo: {tipo.fonteReferencia}</p> : null}
    </div>
  )
}

function ErroAoSalvar({ erro, conflito }: { erro: Error; conflito?: Lancamento }) {
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
        <p className="font-semibold">{ehConflito(erro) ? 'Lançamento já cadastrado' : 'Não foi possível salvar'}</p>
        <p>{porCampo ? 'Revise os campos destacados.' : erro.message}</p>
        {conflito ? (
          <Link
            to="/admin/lancamentos/$lancamentoId"
            params={{ lancamentoId: conflito.id }}
            className="font-semibold text-brand-purple underline-offset-4 hover:underline"
          >
            Abrir o lançamento existente para corrigi-lo
          </Link>
        ) : null}
      </div>
    </Alert>
  )
}
