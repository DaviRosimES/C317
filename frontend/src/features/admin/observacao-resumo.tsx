import type { ReactNode } from 'react'
import { Ban, CircleCheck, CircleDashed, ExternalLink, Info } from 'lucide-react'
import { ApiError } from '@/api/http/api-error'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, DemoBadge, Skeleton } from '@/components/ui'
import { dominioDoLink, formatValorObservacao } from '@/lib/format'
import { rotuloTipoReferencia } from '@/lib/referencia'
import { cn } from '@/lib/utils'
import type { Fonte, ItemCatalogo, Observacao, ObservacaoAdmin } from '@/models'
import { useObservacaoPublica } from '@/queries/observacao.queries'
import { descreverUnidade, rotuloClassificacao } from './observacao-catalogo'

export function SituacaoObservacao({ observacao }: { observacao: ObservacaoAdmin }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {observacao.divulgacaoBloqueada ? (
        <Badge variant="danger">Divulgação bloqueada</Badge>
      ) : observacao.status === 'publicado' ? (
        <Badge variant="success">Publicada</Badge>
      ) : (
        <Badge variant="warning">Rascunho</Badge>
      )}
      {observacao.demonstracao ? <DemoBadge /> : null}
    </span>
  )
}

/** Valor exato, como recebido; o arredondamento é só da consulta pública. */
export const valorExato = (o: Observacao) => formatValorObservacao(o.valor, o.unidade, o.qualificador)

export const descreverRecorte = (o: Observacao) => (o.categoria ? o.categoria.nome : 'Total (sem recorte)')

export function LinksFonte({ fonte, className }: { fonte: Fonte; className?: string }) {
  if (!fonte.links.length) {
    return <p className={cn('text-xs text-ink-subtle', className)}>Sem link: a fonte é identificada pelo nome do documento.</p>
  }
  return (
    <ul className={cn('flex flex-col gap-1', className)}>
      {fonte.links.map((link) => (
        <li key={link} className="min-w-0">
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 text-xs font-medium text-brand-purple underline-offset-4 hover:underline"
          >
            <ExternalLink aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{dominioDoLink(link)}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function Item({ termo, className, children }: { termo: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs font-medium text-ink-muted">{termo}</dt>
      <dd className="mt-1 break-words text-ink">{children}</dd>
    </div>
  )
}

/** Todos os metadados que acompanham o valor na consulta pública. */
export function FichaObservacao({ observacao: o, indicadores }: { observacao: ObservacaoAdmin; indicadores: ItemCatalogo[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
      <Item termo="Indicador" className="sm:col-span-2">
        {o.indicador.nome}
      </Item>
      <Item termo="Território">{o.territorio.nome}</Item>
      <Item termo="Recorte da fonte">
        {o.categoria ? (
          <>
            {o.categoria.nome}
            <span className="block text-xs text-ink-subtle">{rotuloClassificacao(o.categoria.classificacao, indicadores)}</span>
          </>
        ) : (
          'Total (sem recorte)'
        )}
      </Item>
      <Item termo="Referência">
        {o.referencia.rotulo}
        <span className="block text-xs text-ink-subtle">{rotuloTipoReferencia(o.referencia.tipo)}</span>
      </Item>
      <Item termo="CNAE">{o.codigoCnae ?? <span className="text-ink-muted">Não informado pela fonte</span>}</Item>
      <Item termo="Valor exato">
        <span className="text-lg font-bold tabular-nums">{valorExato(o)}</span>
      </Item>
      <Item termo="Unidade">
        {o.unidade.nome}
        <span className="block text-xs text-ink-subtle">{descreverUnidade(o.unidade)}</span>
      </Item>
      <Item termo="Fonte" className="sm:col-span-2">
        {o.fonte.nome}
        <LinksFonte fonte={o.fonte} className="mt-1" />
      </Item>
      <Item termo="Temas" className="sm:col-span-2">
        <span className="flex flex-wrap gap-2">
          {o.temas.map((tema) => (
            <Badge key={tema.codigo} variant="neutral">
              {tema.nome}
            </Badge>
          ))}
        </span>
      </Item>
      <Item termo="Notas de leitura" className="sm:col-span-2">
        {o.notas.length ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-ink-muted">
            {o.notas.map((nota) => (
              <li key={nota}>{nota}</li>
            ))}
          </ul>
        ) : (
          <span className="text-ink-muted">Sem notas</span>
        )}
      </Item>
    </dl>
  )
}

type EstadoConferencia = 'ok' | 'pendente' | 'bloqueio' | 'info'

const ICONES: Record<EstadoConferencia, ReactNode> = {
  ok: <CircleCheck aria-hidden className="size-4 text-success" />,
  pendente: <CircleDashed aria-hidden className="size-4 text-warning" />,
  bloqueio: <Ban aria-hidden className="size-4 text-danger" />,
  info: <Info aria-hidden className="size-4 text-brand-purple" />,
}

/** Situação de publicação: o que impede (bloqueio) e o que ainda falta (rascunho). */
export function ConferenciaPublicacao({ observacao: o }: { observacao: ObservacaoAdmin }) {
  const itens: { estado: EstadoConferencia; titulo: string; detalhe?: string }[] = [
    o.divulgacaoBloqueada
      ? { estado: 'bloqueio', titulo: 'Divulgação bloqueada', detalhe: o.motivoBloqueio ?? undefined }
      : { estado: 'ok', titulo: 'Divulgação liberada' },
    o.status === 'publicado'
      ? {
          estado: 'ok',
          titulo: 'Publicada',
          detalhe: o.publicadoEm ? `Em ${o.publicadoEm.toLocaleString('pt-BR')}` : undefined,
        }
      : {
          estado: 'pendente',
          titulo: 'Aguardando publicação',
          detalhe: o.divulgacaoBloqueada
            ? 'Desbloqueie antes de publicar.'
            : 'Rascunhos ficam fora da consulta pública.',
        },
    { estado: 'ok', titulo: `Referência ${rotuloTipoReferencia(o.referencia.tipo).toLowerCase()} confirmada`, detalhe: o.referencia.rotulo },
    o.fonte.links.length
      ? { estado: 'ok', titulo: 'Fonte com link', detalhe: o.fonte.nome }
      : { estado: 'info', titulo: 'Fonte sem link', detalhe: 'Identificada pelo nome do documento; nenhum endereço é inventado.' },
  ]
  if (o.demonstracao) itens.push({ estado: 'info', titulo: 'Dado fictício', detalhe: 'Exibido com o selo de demonstração.' })

  return (
    <ul className="flex flex-col gap-3">
      {itens.map((item) => (
        <li key={item.titulo} className="flex items-start gap-3 text-sm">
          <span className="mt-0.5">{ICONES[item.estado]}</span>
          <span className="min-w-0">
            <span className="font-medium text-ink">{item.titulo}</span>
            {item.detalhe ? <span className="block break-words text-[13px] text-ink-muted">{item.detalhe}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Lê a consulta pública logo após cada alteração: sem espera, o resultado já está confirmado (V4). */
export function ConsultaPublicaObservacao({ id }: { id: string }) {
  const publica = useObservacaoPublica(id)
  const ausente = publica.error instanceof ApiError && publica.error.status === 404

  return (
    <Card>
      <CardHeader>
        <CardTitle>Na consulta pública</CardTitle>
        <CardDescription>O que a API pública devolve agora para esta observação.</CardDescription>
      </CardHeader>
      <CardContent aria-live="polite" className={cn(publica.isFetching && 'opacity-70')}>
        {/* Um refetch com erro mantém o dado anterior: o 404 tem prioridade sobre ele. */}
        {publica.isPending ? (
          <Skeleton className="h-14 rounded-lg" />
        ) : ausente ? (
          <p className="flex items-start gap-2 text-sm text-ink-muted">
            <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            Não aparece: rascunhos e observações com divulgação bloqueada ficam fora da consulta.
          </p>
        ) : publica.isError ? (
          <p className="text-sm text-danger">Não foi possível consultar: {publica.error.message}</p>
        ) : (
          <div className="flex flex-col gap-1 text-sm">
            <span className="flex items-center gap-2 font-medium text-ink">
              <CircleCheck aria-hidden className="size-4 text-success" />
              Visível
            </span>
            <span className="text-lg font-bold tabular-nums text-ink">
              {formatValorObservacao(publica.data.valorExibicao, publica.data.unidade, publica.data.qualificador)}
            </span>
            <span className="text-xs text-ink-muted">
              {publica.data.referencia.rotulo} · Fonte: {publica.data.fonte.nome}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
