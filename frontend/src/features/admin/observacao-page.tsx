import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, TriangleAlert } from 'lucide-react'
import { ApiError } from '@/api/http/api-error'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FilterChip,
  FilterChips,
  FormField,
  Input,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { compararDecimal, decimalParaCampo } from '@/lib/decimal'
import { formatDecimal } from '@/lib/format'
import type { ObservacaoAdmin, ObservacaoCorrecao, Proveniencia, Qualificador } from '@/models'
import { useCorrigirObservacao, useObservacaoAdmin } from '@/queries/admin-observacao.queries'
import { useCatalogosObservacoes } from '@/queries/observacao.queries'
import { AdminContainer, AdminPageHeader } from './admin-layout'
import { AcoesPublicacao } from './observacao-acoes'
import { ConferenciaPublicacao, ConsultaPublicaObservacao, FichaObservacao, SituacaoObservacao, descreverRecorte } from './observacao-resumo'
import { lerNotas, validarValor } from './observacao-validacao'

export function ObservacaoPage({ id }: { id: string }) {
  const observacao = useObservacaoAdmin(id)
  const catalogos = useCatalogosObservacoes()

  if (!observacao.isSuccess || !catalogos.isSuccess) {
    const erro = observacao.error ?? catalogos.error
    const naoEncontrada = observacao.error instanceof ApiError && observacao.error.status === 404
    return (
      <AdminContainer>
        <AdminPageHeader title="Observação" />
        {erro ? (
          <EmptyState
            title={naoEncontrada ? 'Observação não encontrada' : 'Não foi possível carregar a observação'}
            description={naoEncontrada ? 'O endereço pode estar incorreto.' : erro.message}
            action={
              <Button asChild variant="secondary">
                <Link to="/admin/observacoes">Voltar às observações</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        )}
      </AdminContainer>
    )
  }

  const o = observacao.data
  return (
    <AdminContainer>
      <AdminPageHeader
        title={o.indicador.nome}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {o.territorio.nome} · {descreverRecorte(o)} · {o.referencia.rotulo}
            <SituacaoObservacao observacao={o} />
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Dados da observação</CardTitle>
              <CardDescription>Indicador, território, recorte, referência, unidade e fonte formam a identidade e não mudam.</CardDescription>
            </CardHeader>
            <CardContent>
              <FichaObservacao observacao={o} indicadores={catalogos.data.indicadores} />
            </CardContent>
          </Card>
          <CorrecaoObservacao observacao={o} />
          <Historico proveniencias={o.proveniencias} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Publicação</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <ConferenciaPublicacao observacao={o} />
              <AcoesPublicacao observacao={o} />
            </CardContent>
          </Card>
          <ConsultaPublicaObservacao id={o.id} />
        </div>
      </div>

      <Button asChild variant="secondary" className="self-start">
        <Link to="/admin/observacoes">Voltar às observações</Link>
      </Button>
    </AdminContainer>
  )
}

function CorrecaoObservacao({ observacao: o }: { observacao: ObservacaoAdmin }) {
  const corrigir = useCorrigirObservacao()
  // O campo mostra o valor exato recebido, sem arredondamento.
  const [valor, setValor] = React.useState(decimalParaCampo(o.valor))
  const [qualificador, setQualificador] = React.useState<Qualificador>(o.qualificador)
  const [notas, setNotas] = React.useState(o.notas.join('\n'))
  const [erros, setErros] = React.useState<{ valor?: string; notas?: string }>({})
  const [aviso, setAviso] = React.useState<'salva' | 'sem-alteracao' | null>(null)

  function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAviso(null)
    const lido = validarValor(valor, o.unidade)
    const novasNotas = lerNotas(notas)
    const novosErros: typeof erros = {}
    if ('erro' in lido) novosErros.valor = lido.erro
    if (novasNotas.some((nota) => nota.length > 2000)) novosErros.notas = 'Cada nota pode ter até 2.000 caracteres.'
    setErros(novosErros)
    if ('erro' in lido || novosErros.notas) {
      document.getElementById(novosErros.valor ? 'correcao-valor' : 'correcao-notas')?.focus()
      return
    }

    const correcao: ObservacaoCorrecao = {}
    if (compararDecimal(lido.valor, o.valor) !== 0) correcao.valor = lido.valor
    if (qualificador !== o.qualificador) correcao.qualificador = qualificador
    if (novasNotas.join('\n') !== o.notas.join('\n')) correcao.notas = novasNotas
    if (!Object.keys(correcao).length) {
      setAviso('sem-alteracao')
      return
    }
    corrigir.mutate({ id: o.id, correcao }, { onSuccess: () => setAviso('salva') })
  }

  const limpar = () => {
    setAviso(null)
    corrigir.reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correção</CardTitle>
        <CardDescription>
          Corrija valor, qualificador ou notas. O valor anterior fica registrado no histórico. Para outro indicador, território,
          recorte, referência, unidade ou fonte, cadastre uma nova observação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={salvar} className="flex flex-col gap-4">
          {o.status === 'publicado' ? (
            <Alert variant="warning">
              <TriangleAlert aria-hidden />
              <p>Esta observação está publicada: a correção aparece imediatamente na consulta pública.</p>
            </Alert>
          ) : null}
          {corrigir.error ? (
            <Alert variant="danger">
              <AlertCircle aria-hidden />
              <p>Não foi possível salvar a correção: {corrigir.error.message}</p>
            </Alert>
          ) : aviso === 'salva' ? (
            <Alert variant="success">
              <CheckCircle2 aria-hidden />
              <p>Correção salva.</p>
            </Alert>
          ) : aviso === 'sem-alteracao' ? (
            <Alert variant="info">
              <AlertCircle aria-hidden />
              <p>Nada foi alterado.</p>
            </Alert>
          ) : null}

          <FilterChips
            aria-label="Qualificador"
            value={qualificador}
            onValueChange={(novo) => {
              setQualificador(novo as Qualificador)
              limpar()
            }}
          >
            <FilterChip value="igual">Igual ao informado</FilterChip>
            <FilterChip value="maior_que">Limite (“mais de”)</FilterChip>
          </FilterChips>
          <FormField
            label={`Valor (${o.unidade.nome})`}
            labelVariant="field"
            htmlFor="correcao-valor"
            error={erros.valor}
            hint="Valor exato, com todas as casas recebidas; vírgula para decimais."
            className="sm:max-w-sm"
          >
            <Input
              id="correcao-valor"
              inputMode="decimal"
              autoComplete="off"
              value={valor}
              onChange={(event) => {
                setValor(event.target.value)
                setErros((atuais) => ({ ...atuais, valor: undefined }))
                limpar()
              }}
              aria-invalid={!!erros.valor}
              aria-describedby="correcao-valor-message"
            />
          </FormField>
          <FormField
            label="Notas de leitura"
            labelVariant="field"
            htmlFor="correcao-notas"
            error={erros.notas}
            hint="Uma nota por linha."
          >
            <Textarea
              id="correcao-notas"
              value={notas}
              onChange={(event) => {
                setNotas(event.target.value)
                setErros((atuais) => ({ ...atuais, notas: undefined }))
                limpar()
              }}
              aria-invalid={!!erros.notas}
              aria-describedby="correcao-notas-message"
            />
          </FormField>
          <Button type="submit" variant={o.status === 'publicado' ? 'gradient' : 'secondary'} className="self-start" disabled={corrigir.isPending}>
            {corrigir.isPending ? 'Salvando…' : 'Salvar correção'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

const ORIGENS: Record<string, string> = {
  cadastro_administrativo: 'Cadastrada pela área administrativa',
  correcao_administrativa: 'Corrigida pela área administrativa',
}

function descreverAnterior(anterior: Record<string, unknown>) {
  return Object.entries(anterior)
    .map(([campo, valor]) => {
      if (campo === 'valor' && typeof valor === 'string') return `valor ${formatDecimal(valor)}`
      if (campo === 'qualificador') return valor === 'maior_que' ? 'limite “mais de”' : 'valor igual ao informado'
      if (campo === 'notas' && Array.isArray(valor)) return valor.length ? `notas: ${valor.join(' / ')}` : 'sem notas'
      return `${campo}: ${String(valor)}`
    })
    .join('; ')
}

/** Origem na planilha recebida e registros de cadastro e correção. */
function Historico({ proveniencias }: { proveniencias: Proveniencia[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proveniência e histórico</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3 text-sm">
          {proveniencias.map((p, i) => (
            <li key={i} className="rounded-lg bg-canvas p-3">
              {p.tipo === 'planilha' ? (
                <>
                  <p className="font-medium text-ink">
                    Planilha recebida · aba {p.aba}, célula {p.celula}
                  </p>
                  <p className="mt-1 break-words text-[13px] text-ink-muted">
                    {[
                      p.valorOriginal !== null ? `Valor original ${formatDecimal(p.valorOriginal)}` : null,
                      p.referenciaOriginal ? `referência “${p.referenciaOriginal}”` : null,
                      p.recorteOriginal ? `recorte “${p.recorteOriginal}”` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-ink">{ORIGENS[p.origem] ?? p.origem}</p>
                  <p className="mt-1 break-words text-[13px] text-ink-muted">
                    {[
                      p.registradoEm ? p.registradoEm.toLocaleString('pt-BR') : null,
                      p.usuarioId !== null ? `usuário nº ${p.usuarioId}` : null,
                      p.anterior ? `antes: ${descreverAnterior(p.anterior)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
