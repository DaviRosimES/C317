import * as React from 'react'
import { AlertCircle } from 'lucide-react'
import { ApiError } from '@/api/http/api-error'
import {
  Alert,
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { toDataIso, toDataLocal } from '@/lib/format'
import { mesLongo } from '@/lib/periodo'
import type { LimitesRelatorio, RelatorioAdmin, RelatorioCorrecao, RelatorioEntrada, TipoRelatorio } from '@/models'

export const TIPOS_RELATORIO: Record<TipoRelatorio, string> = {
  relatorio_tecnico: 'Relatório técnico',
  peca_divulgacao: 'Peça de divulgação',
}

const OPCIONAL = '(opcional — só se informado no documento)'
const NAO_INFORMADO = 'nao-informado'

export type Campo = 'titulo' | 'fonte' | 'arquivo' | 'numero' | 'tipo' | 'data' | 'ano' | 'mes'
export type ErrosRelatorio = Partial<Record<Campo, string>>

/** Campo alterado deixa de mostrar o erro (local ou da API) até o próximo envio, que recalcula tudo. */
const limparErros = (campos: string[]) => (atual: ErrosRelatorio) =>
  Object.fromEntries([...Object.entries(atual), ...campos.map((campo) => [campo, undefined])]) as ErrosRelatorio

/** Ordem visual dos campos: o foco vai para o primeiro com erro. */
const ORDEM: Campo[] = ['titulo', 'fonte', 'arquivo', 'numero', 'tipo', 'data', 'ano', 'mes']
const ID_CAMPO: Record<Campo, string> = {
  titulo: 'relatorio-titulo',
  fonte: 'relatorio-fonte',
  arquivo: 'relatorio-arquivo',
  numero: 'relatorio-numero',
  tipo: 'relatorio-tipo',
  data: 'relatorio-data',
  ano: 'relatorio-ano',
  mes: 'relatorio-mes',
}
/** Nome do campo na API → campo da tela. */
const CAMPO_DA_API: Record<string, Campo> = {
  titulo: 'titulo',
  fonte: 'fonte',
  arquivo: 'arquivo',
  numero: 'numero',
  tipo: 'tipo',
  data_publicacao: 'data',
  ano: 'ano',
  mes: 'mes',
}

export function focarPrimeiroErro(erros: ErrosRelatorio) {
  const campo = ORDEM.find((c) => erros[c])
  if (!campo) return
  window.requestAnimationFrame(() => document.getElementById(ID_CAMPO[campo])?.focus())
}

/** 422 do Pydantic com erro por campo; mensagens de texto (413, 422 do conteúdo) ficam no Alert. */
export function errosDaApi(erro: Error | null): ErrosRelatorio {
  const resultado: ErrosRelatorio = {}
  if (!(erro instanceof ApiError)) return resultado
  for (const [campoApi, mensagem] of Object.entries(erro.fieldErrors)) {
    const campo = CAMPO_DA_API[campoApi]
    if (campo) resultado[campo] ??= mensagem
  }
  return resultado
}

export interface ValoresRelatorio {
  titulo: string
  fonte: string
  numero: string
  tipo: '' | TipoRelatorio
  data: string
  ano: string
  mes: string
}

export const valoresVazios: ValoresRelatorio = { titulo: '', fonte: '', numero: '', tipo: '', data: '', ano: '', mes: '' }

export const valoresDoRelatorio = (r: RelatorioAdmin): ValoresRelatorio => ({
  titulo: r.titulo,
  fonte: r.fonte ?? '',
  numero: r.numero ?? '',
  tipo: r.tipo ?? '',
  data: r.dataPublicacao ? toDataIso(r.dataPublicacao) : '',
  ano: r.periodo ? String(r.periodo.ano) : '',
  mes: r.periodo?.mes ? String(r.periodo.mes) : '',
})

const ANO_INVALIDO = 'Informe um ano entre 1900 e 2100.'

function lerAno(texto: string): number | null {
  if (!/^\d{4}$/.test(texto)) return null
  const ano = Number(texto)
  return ano >= 1900 && ano <= 2100 ? ano : null
}

/** Validação de cortesia; o servidor confere o conteúdo do arquivo e as demais regras. */
export function validarMetadados(v: ValoresRelatorio, opcoes: { fonteObrigatoria: boolean }): ErrosRelatorio {
  const erros: ErrosRelatorio = {}
  if (!v.titulo.trim()) erros.titulo = 'Informe o título do relatório.'
  if (opcoes.fonteObrigatoria && !v.fonte.trim()) erros.fonte = 'Informe a fonte do relatório.'
  const ano = v.ano.trim()
  if (ano && lerAno(ano) === null) erros.ano = ANO_INVALIDO
  if (v.mes && !ano) erros.mes = 'Informe o ano de referência para informar o mês.'
  return erros
}

export function formatTamanho(bytes: number) {
  const mb = bytes / 1_048_576
  if (mb >= 1) return `${mb.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('pt-BR')} kB`
}

/** "Somente PDF, até 20 MB" a partir do limite informado pela API. */
export const textoDoLimite = (limites: LimitesRelatorio) => `Somente PDF, até ${formatTamanho(limites.tamanhoMaximoBytes)}`

export function validarArquivo(arquivo: File | null, limites?: LimitesRelatorio): string | undefined {
  if (!arquivo) return 'Escolha o arquivo PDF do relatório.'
  const ehPdf = arquivo.type === 'application/pdf' || arquivo.name.toLowerCase().endsWith('.pdf')
  if (!ehPdf) return 'O arquivo precisa ser um PDF.'
  if (arquivo.size === 0) return 'O arquivo está vazio.'
  if (limites && arquivo.size > limites.tamanhoMaximoBytes) {
    return `O arquivo tem ${formatTamanho(arquivo.size)} e o limite é ${formatTamanho(limites.tamanhoMaximoBytes)}.`
  }
  return undefined
}

/** Seletor de PDF com limite informado antes do envio e nome e tamanho do arquivo escolhido. */
export function SeletorPdf({
  id = ID_CAMPO.arquivo,
  label = 'Arquivo PDF',
  limites,
  arquivo,
  onChange,
  erro,
  disabled,
}: {
  id?: string
  label?: string
  limites?: LimitesRelatorio
  arquivo: File | null
  onChange: (arquivo: File | null) => void
  erro?: string
  disabled?: boolean
}) {
  const limite = limites ? textoDoLimite(limites) : 'Somente PDF'
  return (
    <FormField label={label} labelVariant="field" htmlFor={id} error={erro} hint={limite}>
      <Input
        id={id}
        type="file"
        accept="application/pdf"
        disabled={disabled}
        aria-invalid={erro ? true : undefined}
        aria-describedby={`${id}-message ${id}-escolhido`}
        className="h-auto py-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:text-[13px] file:font-semibold file:text-brand-purple"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <p id={`${id}-escolhido`} className="break-all text-[13px] text-ink-muted">
        {arquivo ? `Arquivo escolhido: ${arquivo.name} (${formatTamanho(arquivo.size)})` : 'Nenhum arquivo escolhido.'}
      </p>
    </FormField>
  )
}

function CamposMetadados({
  valores,
  onChange,
  erros,
  disabled,
}: {
  valores: ValoresRelatorio
  onChange: (parcial: Partial<ValoresRelatorio>) => void
  erros: ErrosRelatorio
  disabled: boolean
}) {
  const invalido = (campo: Campo) => (erros[campo] ? true : undefined)
  const descrito = (campo: Campo) => (erros[campo] ? `${ID_CAMPO[campo]}-message` : undefined)
  return (
    <>
      <FormField label="Título" labelVariant="field" htmlFor={ID_CAMPO.titulo} error={erros.titulo}>
        <Input
          id={ID_CAMPO.titulo}
          required
          disabled={disabled}
          value={valores.titulo}
          aria-invalid={invalido('titulo')}
          aria-describedby={descrito('titulo')}
          onChange={(e) => onChange({ titulo: e.target.value })}
        />
      </FormField>
      <FormField label="Fonte" labelVariant="field" htmlFor={ID_CAMPO.fonte} error={erros.fonte} hint="Quem produziu ou publicou o documento.">
        <Input
          id={ID_CAMPO.fonte}
          required
          disabled={disabled}
          value={valores.fonte}
          aria-invalid={invalido('fonte')}
          aria-describedby={`${ID_CAMPO.fonte}-message`}
          onChange={(e) => onChange({ fonte: e.target.value })}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={`Número ${OPCIONAL}`} labelVariant="field" htmlFor={ID_CAMPO.numero} error={erros.numero}>
          <Input
            id={ID_CAMPO.numero}
            placeholder="004/2025"
            disabled={disabled}
            value={valores.numero}
            aria-invalid={invalido('numero')}
            aria-describedby={descrito('numero')}
            onChange={(e) => onChange({ numero: e.target.value })}
          />
        </FormField>
        <FormField label={`Tipo ${OPCIONAL}`} labelVariant="field" htmlFor={ID_CAMPO.tipo} error={erros.tipo}>
          <Select
            disabled={disabled}
            value={valores.tipo || NAO_INFORMADO}
            onValueChange={(valor) => onChange({ tipo: valor === NAO_INFORMADO ? '' : (valor as TipoRelatorio) })}
          >
            <SelectTrigger id={ID_CAMPO.tipo} aria-invalid={invalido('tipo')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NAO_INFORMADO}>Não informado</SelectItem>
              {(Object.keys(TIPOS_RELATORIO) as TipoRelatorio[]).map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {TIPOS_RELATORIO[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <FormField
        label={`Data original do documento ${OPCIONAL}`}
        labelVariant="field"
        htmlFor={ID_CAMPO.data}
        error={erros.data}
        hint="A data do documento, não a do envio."
      >
        <Input
          id={ID_CAMPO.data}
          type="date"
          disabled={disabled}
          value={valores.data}
          aria-invalid={invalido('data')}
          aria-describedby={`${ID_CAMPO.data}-message`}
          onChange={(e) => onChange({ data: e.target.value })}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={`Ano de referência ${OPCIONAL}`}
          labelVariant="field"
          htmlFor={ID_CAMPO.ano}
          error={erros.ano}
          hint="Entre 1900 e 2100."
        >
          <Input
            id={ID_CAMPO.ano}
            inputMode="numeric"
            maxLength={4}
            placeholder="AAAA"
            disabled={disabled}
            value={valores.ano}
            aria-invalid={invalido('ano')}
            aria-describedby={`${ID_CAMPO.ano}-message`}
            onChange={(e) => onChange({ ano: e.target.value.trim() })}
          />
        </FormField>
        <FormField
          label={`Mês de referência ${OPCIONAL}`}
          labelVariant="field"
          htmlFor={ID_CAMPO.mes}
          error={erros.mes}
          hint="Exige o ano; sem mês, a referência é o ano inteiro."
        >
          <Select
            disabled={disabled}
            value={valores.mes || NAO_INFORMADO}
            onValueChange={(valor) => onChange({ mes: valor === NAO_INFORMADO ? '' : valor })}
          >
            <SelectTrigger id={ID_CAMPO.mes} aria-invalid={invalido('mes')} aria-describedby={`${ID_CAMPO.mes}-message`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NAO_INFORMADO}>Não informado</SelectItem>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                <SelectItem key={mes} value={String(mes)}>
                  {mesLongo(mes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </>
  )
}

function AlertaDeErro({ erro, comCampos }: { erro: Error | null; comCampos: boolean }) {
  if (!erro || comCampos) return null
  return (
    <Alert variant="danger">
      <AlertCircle aria-hidden />
      <p>{erro.message}</p>
    </Alert>
  )
}

/** Cadastro: o arquivo e os campos ficam no estado e sobrevivem a uma falha do envio. */
export function RelatorioFormCadastro({
  limites,
  pendente,
  erro,
  onSubmit,
}: {
  limites?: LimitesRelatorio
  pendente: boolean
  erro: Error | null
  onSubmit: (entrada: RelatorioEntrada) => void
}) {
  const [valores, setValores] = React.useState<ValoresRelatorio>(valoresVazios)
  const [arquivo, setArquivo] = React.useState<File | null>(null)
  const [errosLocais, setErrosLocais] = React.useState<ErrosRelatorio>({})
  const errosApi = React.useMemo(() => errosDaApi(erro), [erro])
  const erros = { ...errosApi, ...errosLocais }
  const comCamposDaApi = Object.keys(errosApi).length > 0

  React.useEffect(() => focarPrimeiroErro(errosApi), [errosApi])

  function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const novos: ErrosRelatorio = validarMetadados(valores, { fonteObrigatoria: true })
    const erroArquivo = validarArquivo(arquivo, limites)
    if (erroArquivo) novos.arquivo = erroArquivo
    setErrosLocais(novos)
    if (Object.keys(novos).length || !arquivo) return focarPrimeiroErro(novos)

    onSubmit({
      titulo: valores.titulo.trim(),
      fonte: valores.fonte.trim(),
      arquivo,
      ...(valores.numero.trim() ? { numero: valores.numero.trim() } : {}),
      ...(valores.tipo ? { tipo: valores.tipo } : {}),
      ...(valores.data ? { dataPublicacao: toDataLocal(valores.data) } : {}),
      ...(valores.ano ? { ano: Number(valores.ano) } : {}),
      ...(valores.mes ? { mes: Number(valores.mes) } : {}),
    })
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-5">
      <AlertaDeErro erro={erro} comCampos={comCamposDaApi} />
      <CamposMetadados
        valores={valores}
        onChange={(parcial) => {
          setValores((atual) => ({ ...atual, ...parcial }))
          setErrosLocais(limparErros(Object.keys(parcial)))
        }}
        erros={{ ...erros, arquivo: undefined }}
        disabled={pendente}
      />
      <SeletorPdf
        limites={limites}
        arquivo={arquivo}
        onChange={(novo) => {
          setArquivo(novo)
          setErrosLocais(limparErros(['arquivo']))
        }}
        erro={erros.arquivo}
        disabled={pendente}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="gradient" disabled={pendente}>
          {pendente ? 'Enviando…' : 'Salvar rascunho'}
        </Button>
      </div>
    </form>
  )
}

/** Só o que mudou; `null` remove um opcional. */
export function diferencas(r: RelatorioAdmin, v: ValoresRelatorio): RelatorioCorrecao {
  const original = valoresDoRelatorio(r)
  const correcao: RelatorioCorrecao = {}
  if (v.titulo.trim() !== original.titulo) correcao.titulo = v.titulo.trim()
  if (v.fonte.trim() !== original.fonte && v.fonte.trim()) correcao.fonte = v.fonte.trim()
  if (v.numero.trim() !== original.numero) correcao.numero = v.numero.trim() || null
  if (v.tipo !== original.tipo) correcao.tipo = v.tipo || null
  if (v.data !== original.data) correcao.dataPublicacao = v.data ? toDataLocal(v.data) : null
  if (v.ano !== original.ano) correcao.ano = v.ano ? Number(v.ano) : null
  if (v.mes !== original.mes) correcao.mes = v.mes ? Number(v.mes) : null
  return correcao
}

/** Edição dos metadados; o conteúdo (PDF) é trocado em outro bloco da tela. */
export function RelatorioFormEdicao({
  relatorio,
  pendente,
  erro,
  onSalvar,
}: {
  relatorio: RelatorioAdmin
  pendente: boolean
  erro: Error | null
  onSalvar: (correcao: RelatorioCorrecao) => void
}) {
  const [valores, setValores] = React.useState<ValoresRelatorio>(() => valoresDoRelatorio(relatorio))
  const [errosLocais, setErrosLocais] = React.useState<ErrosRelatorio>({})
  const [semMudancas, setSemMudancas] = React.useState(false)
  const errosApi = React.useMemo(() => errosDaApi(erro), [erro])
  const erros = { ...errosApi, ...errosLocais }

  React.useEffect(() => focarPrimeiroErro(errosApi), [errosApi])

  function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Rascunho antigo sem fonte pode continuar sem; quem já tem fonte não a perde.
    const novos = validarMetadados(valores, { fonteObrigatoria: relatorio.fonte !== null })
    setErrosLocais(novos)
    if (Object.keys(novos).length) return focarPrimeiroErro(novos)
    const correcao = diferencas(relatorio, valores)
    const mudou = Object.keys(correcao).length > 0
    setSemMudancas(!mudou)
    if (mudou) onSalvar(correcao)
  }

  return (
    <form noValidate onSubmit={salvar} className="flex flex-col gap-5">
      <AlertaDeErro erro={erro} comCampos={Object.keys(errosApi).length > 0} />
      <CamposMetadados
        valores={valores}
        onChange={(parcial) => {
          setSemMudancas(false)
          setValores((atual) => ({ ...atual, ...parcial }))
          setErrosLocais(limparErros(Object.keys(parcial)))
        }}
        erros={erros}
        disabled={pendente}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : 'Salvar alterações'}
        </Button>
        {semMudancas ? <span className="text-[13px] text-ink-muted">Nenhuma alteração para salvar.</span> : null}
      </div>
    </form>
  )
}
