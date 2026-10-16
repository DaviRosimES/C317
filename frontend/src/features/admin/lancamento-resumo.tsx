import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, FileClock } from 'lucide-react'
import { Alert, Badge, Button, Card, CardContent, DemoBadge } from '@/components/ui'
import { formatValorIndicador } from '@/lib/format'
import { formatPeriodo } from '@/lib/periodo'
import type { Cnae, Lancamento, StatusLancamento } from '@/models'

export function StatusBadge({ status }: { status: StatusLancamento }) {
  return status === 'publicado' ? <Badge variant="success">Publicado</Badge> : <Badge variant="warning">Rascunho</Badge>
}

export function descreverRecorte(lancamento: Lancamento, cnaes: Cnae[] | undefined) {
  if (lancamento.codigoCnae) {
    const cnae = cnaes?.find((c) => c.codigo === lancamento.codigoCnae)
    return cnae ? `${cnae.nome} (${cnae.codigo})` : `CNAE ${lancamento.codigoCnae}`
  }
  if (lancamento.estabelecimentoId !== null) return `Estabelecimento nº ${lancamento.estabelecimentoId}`
  return 'Total municipal'
}

/** Links da consulta pública em que o lançamento publicado aparece. */
export function LinksConsultaPublica({ lancamento }: { lancamento: Lancamento }) {
  return (
    <>
      {lancamento.periodo.mes !== null ? (
        <Button asChild variant="secondary">
          <Link to="/" search={{ ano: lancamento.periodo.ano, cnae: lancamento.codigoCnae ?? undefined }}>
            Ver no dashboard
          </Link>
        </Button>
      ) : null}
      <Button asChild variant="secondary">
        <Link to="/indicadores" search={{ tema: 'visao-geral', cnae: lancamento.codigoCnae ?? undefined }}>
          Ver em indicadores
        </Link>
      </Button>
    </>
  )
}

interface ResultadoLancamentoProps {
  lancamento: Lancamento
  cnaes: Cnae[] | undefined
  /** Falha ao publicar um lançamento que já foi salvo como rascunho. */
  erroPublicacao: Error | null
  publicando: boolean
  onPublicar: () => void
  continuar: { rotulo: string; onClick: () => void }
}

export function ResultadoLancamento({ lancamento, cnaes, erroPublicacao, publicando, onPublicar, continuar }: ResultadoLancamentoProps) {
  const publicado = lancamento.status === 'publicado'
  return (
    <div className="flex flex-col gap-5">
      {publicado ? (
        <Alert variant="success">
          <CheckCircle2 aria-hidden />
          <p>
            <strong className="font-semibold">Lançamento publicado.</strong> O valor já aparece na consulta pública, com a fonte
            informada.
          </p>
        </Alert>
      ) : (
        <Alert variant="info">
          <FileClock aria-hidden />
          <p>
            <strong className="font-semibold">Rascunho salvo.</strong> Ele fica fora da consulta pública até ser publicado.
          </p>
        </Alert>
      )}
      {erroPublicacao ? (
        <Alert variant="danger">
          <AlertCircle aria-hidden />
          <p>O lançamento foi salvo como rascunho, mas não foi publicado: {erroPublicacao.message}</p>
        </Alert>
      ) : null}

      <Card className="shadow-card">
        <CardContent className="pt-6">
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            <Item termo="Indicador">{lancamento.nome}</Item>
            <Item termo="Período de referência">{formatPeriodo(lancamento.periodo, 'longo')}</Item>
            <Item termo="Recorte">{descreverRecorte(lancamento, cnaes)}</Item>
            <Item termo="Valor">
              <span className="text-lg font-bold tabular-nums">{formatValorIndicador(lancamento.valor, lancamento.unidade)}</span>
            </Item>
            <Item termo="Fonte" className="sm:col-span-2">
              {lancamento.fonte}
            </Item>
            <Item termo="Situação">
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge status={lancamento.status} />
                {lancamento.demonstracao ? <DemoBadge /> : null}
              </span>
            </Item>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        {publicado ? (
          <LinksConsultaPublica lancamento={lancamento} />
        ) : (
          <Button variant="gradient" disabled={publicando} onClick={onPublicar}>
            {publicando ? 'Publicando…' : 'Publicar agora'}
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link to="/admin/lancamentos">Ver lançamentos</Link>
        </Button>
        <Button variant="ghost" onClick={continuar.onClick}>
          {continuar.rotulo}
        </Button>
      </div>
    </div>
  )
}

function Item({ termo, className, children }: { termo: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-ink-muted">{termo}</dt>
      <dd className="mt-1 break-words text-ink">{children}</dd>
    </div>
  )
}
